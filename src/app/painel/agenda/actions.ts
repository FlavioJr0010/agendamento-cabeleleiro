"use server";

import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, lt, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  agendamentos,
  bloqueios,
  fichaTecnica,
  lancamentos,
  movimentacoesEstoque,
  profissionais,
  servicos,
  user,
} from "@/db/schema";
import { buscarDisponibilidade, STATUS_LIVRES } from "@/db/consultas/agenda";
import { obterAgendamentoEquipe } from "@/db/consultas/agenda-equipe";
import { registrarMensagemSistema } from "@/db/consultas/mensagens";
import { erroValidacao, executarAcao, falha, sucesso, type EstadoAcao } from "@/lib/acao";
import { avisarListaEspera } from "@/lib/lista-espera";
import { dataLocal, formatarDataHora, hojeNoSalao, localParaUtc } from "@/lib/fuso";
import { agendarLembrete, cancelarLembretes } from "@/lib/notificacoes";
import { obterConfiguracoes } from "@/lib/salao";
import { autorizarAcao } from "@/lib/sessao";

const EQUIPE = ["dona", "profissional"] as const;

async function carregar(id: string) {
  const { user: u } = await autorizarAcao([...EQUIPE]);
  if (!z.uuid().safeParse(id).success) return { u, ag: null };
  const ag = await obterAgendamentoEquipe(u, id);
  return { u, ag };
}

type Status = (typeof agendamentos.$inferSelect)["status"];

async function mudarStatus(id: string, de: Status[], para: Status, extra: Partial<typeof agendamentos.$inferInsert> = {}) {
  const r = await db
    .update(agendamentos)
    .set({ status: para, ...extra })
    .where(and(eq(agendamentos.id, id), inArray(agendamentos.status, de)))
    .returning({ id: agendamentos.id });
  return r.length > 0;
}

export async function confirmarAgendamentoEquipe(id: string) {
  return executarAcao(async () => {
    const { ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    if (!(await mudarStatus(id, ["pendente"], "confirmado"))) return falha("Só é possível confirmar agendamentos pendentes.");
    const config = await obterConfiguracoes();
    await registrarMensagemSistema(id, `Agendamento confirmado ✓ — ${ag.servico} com ${ag.profissional}, ${formatarDataHora(ag.inicio)}.`, `Agendamento: ${ag.servico}`);
    await agendarLembrete(id, config.nome);
    return sucesso("Agendamento confirmado. A cliente foi avisada.");
  });
}

export async function iniciarAtendimento(id: string) {
  return executarAcao(async () => {
    const { ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    if (!(await mudarStatus(id, ["pendente", "confirmado"], "em_atendimento"))) return falha("Este atendimento não pode ser iniciado.");
    return sucesso("Atendimento iniciado.");
  });
}

export async function marcarFalta(id: string) {
  return executarAcao(async () => {
    const { ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    if (!(await mudarStatus(id, ["pendente", "confirmado"], "faltou"))) return falha("Não é possível marcar falta neste status.");
    await cancelarLembretes(id);
    return sucesso("Falta registrada.");
  });
}

export async function cancelarPeloSalao(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    const { u, ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 300) || null;
    const ok = await mudarStatus(id, ["pendente", "confirmado"], "cancelado", { canceladoPor: u.id, motivoCancelamento: motivo });
    if (!ok) return falha("Este agendamento não pode mais ser cancelado.");
    await cancelarLembretes(id);
    await registrarMensagemSistema(
      id,
      `O salão cancelou o agendamento de ${formatarDataHora(ag.inicio)}.${motivo ? ` Motivo: ${motivo}` : ""} Se quiser, agende um novo horário pelo site.`,
      `Agendamento: ${ag.servico}`,
    );
    await avisarListaEspera(ag.servicoId, dataLocal(ag.inicio));
    return sucesso("Agendamento cancelado e cliente avisada.");
  });
}

const FORMAS = ["pix", "dinheiro", "credito", "debito", "outro"] as const;

/** Conclui: registra o pagamento no caixa (com comissão) e dá baixa nos produtos da ficha técnica. */
export async function concluirAtendimento(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    const { u, ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    const dados = z
      .object({
        forma: z.enum(FORMAS, { message: "Escolha a forma de pagamento." }),
        valor: z
          .string()
          .transform((v) => Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100))
          .refine((v) => Number.isFinite(v) && v > 0, "Valor inválido."),
      })
      .safeParse({ forma: formData.get("forma"), valor: String(formData.get("valor") ?? "") });
    if (!dados.success) return erroValidacao(dados.error);
    if (!["pendente", "confirmado", "em_atendimento"].includes(ag.status)) {
      return falha("Este atendimento já foi concluído ou cancelado.");
    }

    await db.transaction(async (tx) => {
      const r = await tx
        .update(agendamentos)
        .set({ status: "concluido" })
        .where(and(eq(agendamentos.id, id), inArray(agendamentos.status, ["pendente", "confirmado", "em_atendimento"])))
        .returning({ id: agendamentos.id });
      if (r.length === 0) throw new Error("Status do agendamento mudou durante a conclusão.");

      const comissao = Math.round((dados.data.valor * Number(ag.comissaoPercentual)) / 100);
      await tx.insert(lancamentos).values({
        tipo: "entrada",
        categoria: "servico",
        descricao: `${ag.servico} — ${ag.clienteNome}`,
        valorCentavos: dados.data.valor,
        formaPagamento: dados.data.forma,
        data: hojeNoSalao(),
        agendamentoId: id,
        profissionalId: ag.profissionalId,
        comissaoCentavos: comissao,
        criadoPor: u.id,
      });

      const itens = await tx.select().from(fichaTecnica).where(eq(fichaTecnica.servicoId, ag.servicoId));
      if (itens.length > 0) {
        await tx
          .insert(movimentacoesEstoque)
          .values(
            itens.map((i) => ({
              produtoId: i.produtoId,
              tipo: "consumo" as const,
              quantidade: -Number(i.quantidade),
              agendamentoId: id,
              observacao: `Ficha técnica: ${ag.servico}`,
              criadoPor: u.id,
            })),
          )
          .onConflictDoNothing();
      }
    });
    await cancelarLembretes(id);
    return sucesso("Atendimento concluído e pagamento registrado.");
  });
}

/** Remarca para outro horário livre (mesmo serviço; pode trocar de profissional). */
export async function remarcarAgendamento(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    const { ag } = await carregar(id);
    if (!ag) return falha("Agendamento não encontrado.");
    if (ag.status !== "pendente" && ag.status !== "confirmado") return falha("Só é possível remarcar agendamentos pendentes ou confirmados.");
    const dados = z
      .object({ inicio: z.iso.datetime({ offset: true }).transform((v) => new Date(v)), profissional: z.uuid() })
      .safeParse({ inicio: formData.get("inicio"), profissional: formData.get("profissional") });
    if (!dados.success) return falha("Escolha um horário.");

    const disp = await buscarDisponibilidade({
      servicoId: ag.servicoId,
      profissionalId: dados.data.profissional,
      data: dataLocal(dados.data.inicio),
      clienteId: ag.clienteId,
      ignorarAgendamentoId: id,
      antecedenciaMin: 0,
    });
    if (!disp?.horarios.some((h) => h.inicio.getTime() === dados.data.inicio.getTime())) {
      return falha("Esse horário não está mais livre. Escolha outro.");
    }
    const [s] = await db.select().from(servicos).where(eq(servicos.id, ag.servicoId));
    const fim = new Date(dados.data.inicio.getTime() + (s.duracaoMin + s.intervaloMin) * 60_000);
    await db
      .update(agendamentos)
      .set({ inicio: dados.data.inicio, fim, profissionalId: dados.data.profissional, status: "confirmado" })
      .where(eq(agendamentos.id, id));

    const [p] = await db.select({ nome: profissionais.nome }).from(profissionais).where(eq(profissionais.id, dados.data.profissional));
    await registrarMensagemSistema(id, `Seu horário foi remarcado para ${formatarDataHora(dados.data.inicio)}, com ${p.nome}.`, `Agendamento: ${ag.servico}`);
    await agendarLembrete(id, (await obterConfiguracoes()).nome);
    await avisarListaEspera(ag.servicoId, dataLocal(ag.inicio));
    return sucesso("Agendamento remarcado e cliente avisada.");
  });
}

// ─── Recepção: agendar por telefone / balcão ─────────────────────────────────

export async function criarAgendamentoEquipe(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let criadoId: string | undefined;
  const r = await executarAcao(async () => {
    const { user: u } = await autorizarAcao([...EQUIPE]);
    const dados = z
      .object({
        clienteId: z.string().min(1, "Escolha a cliente."),
        servicoId: z.uuid("Escolha o serviço."),
        profissional: z.uuid("Escolha a profissional."),
        inicio: z.iso.datetime({ offset: true, message: "Escolha o horário." }).transform((v) => new Date(v)),
        observacoes: z.string().trim().max(500).transform((v) => v || null),
      })
      .safeParse({
        clienteId: formData.get("clienteId"),
        servicoId: formData.get("servicoId"),
        profissional: formData.get("profissional"),
        inicio: formData.get("inicio"),
        observacoes: formData.get("observacoes") ?? "",
      });
    if (!dados.success) return erroValidacao(dados.error);
    const d = dados.data;

    if (u.papel === "profissional") {
      const [p] = await db.select({ id: profissionais.id }).from(profissionais).where(eq(profissionais.usuarioId, u.id));
      if (p?.id !== d.profissional) return falha("Você só pode agendar na sua própria agenda.");
    }
    const disp = await buscarDisponibilidade({
      servicoId: d.servicoId,
      profissionalId: d.profissional,
      data: dataLocal(d.inicio),
      clienteId: d.clienteId,
      antecedenciaMin: 0,
    });
    if (!disp?.horarios.some((h) => h.inicio.getTime() === d.inicio.getTime())) {
      return falha("Esse horário não está mais livre. Escolha outro.");
    }
    const [s] = await db.select().from(servicos).where(eq(servicos.id, d.servicoId));
    const [novo] = await db
      .insert(agendamentos)
      .values({
        clienteId: d.clienteId,
        profissionalId: d.profissional,
        servicoId: d.servicoId,
        inicio: d.inicio,
        fim: new Date(d.inicio.getTime() + (s.duracaoMin + s.intervaloMin) * 60_000),
        precoCentavos: s.precoCentavos,
        observacoes: d.observacoes,
        criadoPor: u.id,
        status: "confirmado",
      })
      .returning({ id: agendamentos.id });
    criadoId = novo.id;
    await registrarMensagemSistema(novo.id, `O salão agendou ${s.nome} para ${formatarDataHora(d.inicio)}.`, `Agendamento: ${s.nome}`);
    await agendarLembrete(novo.id, (await obterConfiguracoes()).nome);
    return sucesso();
  });
  if (r?.ok && criadoId) redirect(`/painel/agenda/${criadoId}?criado=1`);
  return r;
}

/** Cadastro rápido de cliente pela recepção (sem senha; ela pode criar acesso depois). */
export async function criarClienteRapido(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let novoId: string | undefined;
  const r = await executarAcao(async () => {
    await autorizarAcao([...EQUIPE]);
    const dados = z
      .object({
        nome: z.string().trim().min(2, "Informe o nome.").max(80),
        telefone: z.string().trim().min(8, "Informe o telefone/WhatsApp.").max(30),
        email: z.union([z.email("E-mail inválido."), z.literal("")]),
      })
      .safeParse({
        nome: formData.get("nome") ?? "",
        telefone: formData.get("telefone") ?? "",
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
      });
    if (!dados.success) return erroValidacao(dados.error);
    novoId = randomUUID().replace(/-/g, "");
    await db.insert(user).values({
      id: novoId,
      name: dados.data.nome,
      // Sem e-mail informado: endereço interno único (não recebe e-mails nem faz login).
      email: dados.data.email || `sem-email+${novoId}@clientes.local`,
      telefone: dados.data.telefone,
      papel: "cliente",
    });
    return sucesso();
  });
  if (r?.ok && novoId) {
    const voltar = String(formData.get("voltar") ?? "/painel/agenda/novo");
    redirect(`${voltar.startsWith("/painel/") ? voltar.split("?")[0] : "/painel/agenda/novo"}?cliente=${novoId}`);
  }
  return r;
}

// ─── Bloqueios (folgas, almoço, férias) ──────────────────────────────────────

async function podeGerirProfissional(usuario: { id: string; papel?: string | null }, profissionalId: string) {
  if (usuario.papel === "dona") return true;
  const [p] = await db.select({ usuarioId: profissionais.usuarioId }).from(profissionais).where(eq(profissionais.id, profissionalId));
  return p?.usuarioId === usuario.id;
}

export async function criarBloqueio(_: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao([...EQUIPE]);
    const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
    const dados = z
      .object({
        profissionalId: z.uuid("Escolha a profissional."),
        dataInicio: z.iso.date("Data inicial inválida."),
        dataFim: z.iso.date("Data final inválida."),
        horaInicio: z.string().regex(HORA).or(z.literal("")),
        horaFim: z.string().regex(HORA).or(z.literal("")),
        motivo: z.string().trim().max(120).transform((v) => v || null),
      })
      .safeParse(Object.fromEntries(["profissionalId", "dataInicio", "dataFim", "horaInicio", "horaFim", "motivo"].map((k) => [k, formData.get(k) ?? ""])));
    if (!dados.success) return erroValidacao(dados.error);
    const d = dados.data;
    if (!(await podeGerirProfissional(u, d.profissionalId))) return falha("Sem permissão para esta agenda.");

    const inicio = localParaUtc(d.dataInicio, d.horaInicio || "00:00");
    const fim = d.horaFim ? localParaUtc(d.dataFim, d.horaFim) : localParaUtc(d.dataFim, "23:59");
    if (fim <= inicio) return falha("O fim precisa ser depois do início.");

    const conflitos = await db
      .select({ inicio: agendamentos.inicio })
      .from(agendamentos)
      .where(
        and(
          eq(agendamentos.profissionalId, d.profissionalId),
          notInArray(agendamentos.status, [...STATUS_LIVRES, "concluido"]),
          lt(agendamentos.inicio, fim),
          gt(agendamentos.fim, inicio),
        ),
      );
    if (conflitos.length > 0) {
      return falha(`Há ${conflitos.length} agendamento(s) nesse período. Remarque ou cancele antes de bloquear.`);
    }
    await db.insert(bloqueios).values({ profissionalId: d.profissionalId, inicio, fim, motivo: d.motivo });
    return sucesso("Período bloqueado.");
  });
}

export async function removerBloqueio(id: string) {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao([...EQUIPE]);
    const [b] = await db.select().from(bloqueios).where(eq(bloqueios.id, id));
    if (!b || !(await podeGerirProfissional(u, b.profissionalId))) return falha("Bloqueio não encontrado.");
    await db.delete(bloqueios).where(eq(bloqueios.id, id));
    await avisarListaEspera(null, dataLocal(b.inicio));
    return sucesso("Bloqueio removido.");
  });
}
