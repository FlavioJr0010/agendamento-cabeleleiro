"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { agendamentos } from "@/db/schema";
import { buscarDisponibilidade, contarAgendamentosFuturos, obterServicoAtivo } from "@/db/consultas/agenda";
import { executarAcao, falha, sucesso, type EstadoAcao } from "@/lib/acao";
import { dataLocal } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { autorizarAcao } from "@/lib/sessao";

const esquema = z.object({
  servicoId: z.uuid("Serviço inválido."),
  profissional: z.union([z.literal("qualquer"), z.uuid("Profissional inválida.")]),
  inicio: z.iso.datetime({ message: "Horário inválido.", offset: true }).transform((v) => new Date(v)),
  observacoes: z
    .string()
    .trim()
    .max(500, "Observação muito longa (máx. 500 caracteres).")
    .transform((v) => v || null),
});

export async function confirmarAgendamento(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
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
    if (!dados.success) return falha(dados.error.issues[0]?.message ?? "Dados inválidos.");
    const { servicoId, profissional, inicio, observacoes } = dados.data;

    if ((await contarAgendamentosFuturos(user.id)) >= REGRAS.limiteAgendamentosFuturos) {
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
    const horario = disp?.horarios.find((h) => h.inicio.getTime() === inicio.getTime());
    const profissionalId = horario?.profissionais[0];
    if (!horario || !profissionalId) {
      return falha("Esse horário não está mais disponível. Por favor, escolha outro.");
    }

    const fim = new Date(inicio.getTime() + (servico.duracaoMin + servico.intervaloMin) * 60_000);
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
