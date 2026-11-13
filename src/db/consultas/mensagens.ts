import "server-only";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, leituras, mensagens, profissionais, servicos, threads, user } from "@/db/schema";

export type PapelEquipe = "dona" | "profissional";
export type UsuarioSessao = { id: string; papel?: string | null };

/**
 * Quem pode ver uma thread:
 * - a cliente dona da thread;
 * - a dona do salão (todas);
 * - a profissional, nas threads de agendamentos dela.
 */
export function filtroAcesso(u: UsuarioSessao): SQL {
  if (u.papel === "dona") return sql`true`;
  if (u.papel === "profissional") {
    return sql`exists (select 1 from agendamentos a join profissionais p on p.id = a.profissional_id
                       where a.id = ${threads.agendamentoId} and p.usuario_id = ${u.id})`;
  }
  return eq(threads.clienteId, u.id);
}

/** Mensagens não lidas por mim numa thread (escritas por outra pessoa ou pelo sistema). */
const naoLidasSql = (usuarioId: string) => sql<number>`(
  select count(*)::int from mensagens m
  where m.thread_id = "threads"."id"
    and (m.autor_id is distinct from ${usuarioId})
    and m.created_at > coalesce(
      (select l.lida_ate from leituras l where l.thread_id = "threads"."id" and l.usuario_id = ${usuarioId}),
      'epoch'::timestamptz))`;

const ultimaMensagemSql = sql<string | null>`(
  select m.conteudo from mensagens m where m.thread_id = "threads"."id" order by m.created_at desc limit 1)`;

export async function listarThreads(u: UsuarioSessao, status?: "aberta" | "aguardando_cliente" | "encerrada") {
  return db
    .select({
      id: threads.id,
      assunto: threads.assunto,
      status: threads.status,
      ultimaMensagemEm: threads.ultimaMensagemEm,
      clienteNome: user.name,
      agendamentoId: threads.agendamentoId,
      ultimaMensagem: ultimaMensagemSql,
      naoLidas: naoLidasSql(u.id),
    })
    .from(threads)
    .innerJoin(user, eq(user.id, threads.clienteId))
    .where(and(filtroAcesso(u), status ? eq(threads.status, status) : undefined))
    .orderBy(desc(threads.ultimaMensagemEm))
    .limit(200);
}

export async function obterThread(u: UsuarioSessao, id: string) {
  const [t] = await db
    .select({
      id: threads.id,
      assunto: threads.assunto,
      status: threads.status,
      clienteId: threads.clienteId,
      clienteNome: user.name,
      clienteTelefone: user.telefone,
      agendamentoId: threads.agendamentoId,
      agendamentoInicio: agendamentos.inicio,
      agendamentoStatus: agendamentos.status,
      servicoNome: servicos.nome,
      profissionalNome: profissionais.nome,
    })
    .from(threads)
    .innerJoin(user, eq(user.id, threads.clienteId))
    .leftJoin(agendamentos, eq(agendamentos.id, threads.agendamentoId))
    .leftJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .leftJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .where(and(eq(threads.id, id), filtroAcesso(u)));
  if (!t) return null;

  const lista = await db
    .select({
      id: mensagens.id,
      conteudo: mensagens.conteudo,
      tipo: mensagens.tipo,
      createdAt: mensagens.createdAt,
      autorId: mensagens.autorId,
      autorNome: user.name,
      autorPapel: user.papel,
    })
    .from(mensagens)
    .leftJoin(user, eq(user.id, mensagens.autorId))
    .where(eq(mensagens.threadId, id))
    .orderBy(asc(mensagens.createdAt));

  return { ...t, mensagens: lista };
}

export async function podeAcessarThread(u: UsuarioSessao, threadId: string) {
  const [t] = await db
    .select({ id: threads.id, clienteId: threads.clienteId })
    .from(threads)
    .where(and(eq(threads.id, threadId), filtroAcesso(u)));
  return t ?? null;
}

export async function contarNaoLidas(u: UsuarioSessao) {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${naoLidasSql(u.id)}), 0)::int` })
    .from(threads)
    .where(filtroAcesso(u));
  return r?.total ?? 0;
}

export async function contarNaoLidasEquipe(usuarioId: string, papel: PapelEquipe) {
  return contarNaoLidas({ id: usuarioId, papel });
}

export async function marcarComoLida(usuarioId: string, threadId: string) {
  await db
    .insert(leituras)
    .values({ threadId, usuarioId, lidaAte: new Date() })
    .onConflictDoUpdate({ target: [leituras.threadId, leituras.usuarioId], set: { lidaAte: new Date() } });
}

/**
 * Registra uma mensagem automática na thread do agendamento (cria a thread se preciso).
 * Usada quando o salão confirma, remarca ou cancela.
 */
export async function registrarMensagemSistema(agendamentoId: string, texto: string, assunto: string) {
  const [ag] = await db
    .select({ clienteId: agendamentos.clienteId })
    .from(agendamentos)
    .where(eq(agendamentos.id, agendamentoId));
  if (!ag) return;

  let [t] = await db.select({ id: threads.id }).from(threads).where(eq(threads.agendamentoId, agendamentoId)).limit(1);
  if (!t) {
    [t] = await db.insert(threads).values({ clienteId: ag.clienteId, agendamentoId, assunto }).returning({ id: threads.id });
  }
  await db.insert(mensagens).values({ threadId: t.id, autorId: null, conteudo: texto, tipo: "sistema" });
}
