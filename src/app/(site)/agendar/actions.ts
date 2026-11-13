"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { listaEspera, agendamentos } from "@/db/schema";
import {
  buscarDisponibilidade,
  contarAgendamentosFuturos,
  obterServicoAtivo,
} from "@/db/consultas/agenda";
import { executarAcao, falha, sucesso, type EstadoAcao } from "@/lib/acao";
import { dataLocal } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { autorizarAcao } from "@/lib/sessao";

const esquema = z.object({
  servicoId: z.uuid("Serviço inválido."),
  profissional: z.union([
    z.literal("qualquer"),
    z.uuid("Profissional inválida."),
  ]),
  inicio: z.iso
    .datetime({ message: "Horário inválido.", offset: true })
    .transform((v) => new Date(v)),
  observacoes: z
    .string()
    .trim()
    .max(500, "Observação muito longa (máx. 500 caracteres).")
    .transform((v) => v || null),
});

export async function confirmarAgendamento(
  _: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  let criado = false;
  const resultado = await executarAcao(async () => {
    // Qualquer pessoa logada agenda para si mesma.
    const { user } = await autorizarAcao(["cliente", "profissional", "dona"]);

    const dados = esquema.safeParse({
      servicoId: formData.get("servicoId"),
      profissional: formData.get("profissional"),
      inicio: formData.get("inicio"),
      observacoes: formData.get("observacoes") ?? "",
    });
    if (!dados.success)
      return falha(dados.error.issues[0]?.message ?? "Dados inválidos.");
    const { servicoId, profissional, inicio, observacoes } = dados.data;

    if (
      (await contarAgendamentosFuturos(user.id)) >=
      REGRAS.limiteAgendamentosFuturos
    ) {
      return falha(
        `Você já tem ${REGRAS.limiteAgendamentosFuturos} agendamentos futuros. Conclua ou cancele um deles para marcar outro.`,
      );
    }

    const servico = await obterServicoAtivo(servicoId);
    if (!servico) return falha("Este serviço não está mais disponível.");

    // Recalcula a disponibilidade no servidor: nunca confia no horário vindo da tela.
    const disp = await buscarDisponibilidade({
      servicoId,
      profissionalId: profissional === "qualquer" ? null : profissional,
      data: dataLocal(inicio),
      clienteId: user.id,
    });
    const horario = disp?.horarios.find(
      (h) => h.inicio.getTime() === inicio.getTime(),
    );
    const profissionalId = horario?.profissionais[0];
    if (!horario || !profissionalId) {
      return falha(
        "Esse horário não está mais disponível. Por favor, escolha outro.",
      );
    }

    const fim = new Date(
      inicio.getTime() + (servico.duracaoMin + servico.intervaloMin) * 60_000,
    );
    // A constraint do banco ainda protege contra duas pessoas confirmando ao mesmo tempo.
    await db.insert(agendamentos).values({
      clienteId: user.id,
      profissionalId,
      servicoId,
      inicio,
      fim,
      precoCentavos: servico.precoCentavos,
      observacoes,
      criadoPor: user.id,
      status: "pendente",
    });
    criado = true;
    return sucesso();
  });

  if (criado) redirect("/meus-agendamentos?novo=1");
  return resultado;
}

export async function entrarListaEspera(
  _: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao([
      "cliente",
      "profissional",
      "dona",
    ]);
    const d = z
      .object({
        servicoId: z.uuid(),
        profissional: z.union([z.uuid(), z.literal("qualquer")]),
        data: z.iso.date(),
        periodo: z.enum(["manha", "tarde", "qualquer"]),
      })
      .safeParse(Object.fromEntries(formData));
    if (!d.success)
      return falha("Escolha serviço, profissional, data e período válidos.");
    const { hojeNoSalao, somarDias } = await import("@/lib/fuso");
    const hoje = hojeNoSalao();
    if (d.data.data < hoje || d.data.data > somarDias(hoje, REGRAS.janelaDias))
      return falha("Data fora do período de agendamento.");
    const servico = await obterServicoAtivo(d.data.servicoId);
    if (!servico) return falha("Serviço indisponível.");
    const profissionalId =
      d.data.profissional === "qualquer" ? null : d.data.profissional;
    const { listarProfissionaisDoServico } =
      await import("@/db/consultas/agenda");
    if (
      profissionalId &&
      !(await listarProfissionaisDoServico(servico.id)).some(
        (p) => p.id === profissionalId,
      )
    )
      return falha("Profissional indisponível para o serviço.");
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${u.id}))`);
      const [existente] = await tx
        .select()
        .from(listaEspera)
        .where(
          and(
            eq(listaEspera.clienteId, u.id),
            eq(listaEspera.servicoId, servico.id),
            eq(listaEspera.data, d.data.data),
            profissionalId
              ? eq(listaEspera.profissionalId, profissionalId)
              : isNull(listaEspera.profissionalId),
            eq(listaEspera.periodo, d.data.periodo),
            isNull(listaEspera.avisadoEm),
          ),
        );
      if (!existente)
        await tx
          .insert(listaEspera)
          .values({
            clienteId: u.id,
            servicoId: servico.id,
            profissionalId,
            data: d.data.data,
            periodo: d.data.periodo,
          });
    });
    return sucesso(
      "Você entrou na lista de espera. Avisaremos por e-mail se abrir uma vaga. A vaga não fica reservada.",
    );
  });
}
