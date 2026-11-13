import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agendamentos,
  notificacoes,
  profissionais,
  servicos,
  user,
} from "@/db/schema";
import { formatarDataHora } from "./fuso";

/** Condição do índice único parcial (agendamento_id, tipo). */
const sqlNaoNulo = sql`${notificacoes.agendamentoId} is not null`;

/**
 * Agenda o lembrete de 24h antes (fila `notificacoes`, processada por `npm run lembretes`).
 * Idempotente: o índice único (agendamento, tipo) impede duplicar.
 */
export async function agendarLembrete(
  agendamentoId: string,
  nomeSalao: string,
) {
  const [a] = await db
    .select({
      clienteId: agendamentos.clienteId,
      inicio: agendamentos.inicio,
      servico: servicos.nome,
      profissional: profissionais.nome,
      clienteNome: user.name,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .innerJoin(user, eq(user.id, agendamentos.clienteId))
    .where(eq(agendamentos.id, agendamentoId));
  if (!a) return;

  const enviarEm = new Date(
    Math.max(Date.now(), a.inicio.getTime() - 24 * 3_600_000),
  );
  const dados = {
    usuarioId: a.clienteId,
    agendamentoId,
    tipo: "lembrete_24h",
    canal: "email" as const,
    enviarEm,
    assunto: `Lembrete: ${a.servico} — ${formatarDataHora(a.inicio)}`,
    corpo:
      `Olá, ${a.clienteNome.split(" ")[0]}!\n\n` +
      `Passando para lembrar do seu horário no ${nomeSalao}:\n` +
      `${a.servico} com ${a.profissional}, ${formatarDataHora(a.inicio)}.\n\n` +
      `Se não puder vir, cancele ou remarque pelo site para liberar o horário. Até logo!`,
  };
  await db
    .insert(notificacoes)
    .values(dados)
    .onConflictDoUpdate({
      target: [notificacoes.agendamentoId, notificacoes.tipo],
      targetWhere: sqlNaoNulo,
      set: { ...dados, enviadoEm: null, erro: null },
    });
}

/** Remove lembretes ainda não enviados (ex.: agendamento cancelado). */
export async function cancelarLembretes(agendamentoId: string) {
  await db
    .delete(notificacoes)
    .where(
      and(
        eq(notificacoes.agendamentoId, agendamentoId),
        isNull(notificacoes.enviadoEm),
      ),
    );
}
