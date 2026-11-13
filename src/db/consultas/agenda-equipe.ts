import "server-only";
import { and, asc, eq, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agendamentos,
  bloqueios,
  horariosTrabalho,
  lancamentos,
  profissionais,
  servicos,
  threads,
  user,
} from "@/db/schema";
import { diaDaSemana, localParaUtc, somarDias } from "@/lib/fuso";
import type { UsuarioSessao } from "./mensagens";

/** Profissionais cuja agenda o usuário pode ver (dona: todas ativas; profissional: só a própria). */
export async function profissionaisVisiveis(u: UsuarioSessao) {
  return db
    .select({ id: profissionais.id, nome: profissionais.nome, comissaoPercentual: profissionais.comissaoPercentual })
    .from(profissionais)
    .where(
      u.papel === "dona"
        ? eq(profissionais.ativo, true)
        : and(eq(profissionais.ativo, true), eq(profissionais.usuarioId, u.id)),
    )
    .orderBy(asc(profissionais.nome));
}

/** Agenda de um período (datas locais [inicio, fim)) para as profissionais informadas. */
export async function listarAgendaPeriodo(profissionalIds: string[], dataInicio: string, dataFim: string) {
  if (profissionalIds.length === 0) return { agendamentos: [], bloqueios: [], faixas: [] };
  const de = localParaUtc(dataInicio, "00:00");
  const ate = localParaUtc(dataFim, "00:00");

  const [ags, blqs, faixas] = await Promise.all([
    db
      .select({
        id: agendamentos.id,
        inicio: agendamentos.inicio,
        fim: agendamentos.fim,
        status: agendamentos.status,
        precoCentavos: agendamentos.precoCentavos,
        observacoes: agendamentos.observacoes,
        profissionalId: agendamentos.profissionalId,
        clienteNome: user.name,
        clienteTelefone: user.telefone,
        servico: servicos.nome,
        duracaoMin: servicos.duracaoMin,
      })
      .from(agendamentos)
      .innerJoin(user, eq(user.id, agendamentos.clienteId))
      .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
      .where(
        and(
          inArray(agendamentos.profissionalId, profissionalIds),
          lt(agendamentos.inicio, ate),
          gt(agendamentos.fim, de),
          sql`${agendamentos.status} <> 'cancelado'`,
        ),
      )
      .orderBy(asc(agendamentos.inicio)),
    db
      .select()
      .from(bloqueios)
      .where(and(inArray(bloqueios.profissionalId, profissionalIds), lt(bloqueios.inicio, ate), gt(bloqueios.fim, de))),
    db.select().from(horariosTrabalho).where(inArray(horariosTrabalho.profissionalId, profissionalIds)),
  ]);
  return { agendamentos: ags, bloqueios: blqs, faixas };
}

export function faixasDoDia<T extends { diaSemana: number }>(faixas: T[], data: string) {
  const d = diaDaSemana(data);
  return faixas.filter((f) => f.diaSemana === d);
}

/** Agendamento com tudo o que a tela de detalhe precisa — respeitando o acesso do usuário. */
export async function obterAgendamentoEquipe(u: UsuarioSessao, id: string) {
  const [a] = await db
    .select({
      id: agendamentos.id,
      inicio: agendamentos.inicio,
      fim: agendamentos.fim,
      status: agendamentos.status,
      precoCentavos: agendamentos.precoCentavos,
      observacoes: agendamentos.observacoes,
      motivoCancelamento: agendamentos.motivoCancelamento,
      createdAt: agendamentos.createdAt,
      clienteId: agendamentos.clienteId,
      clienteNome: user.name,
      clienteEmail: user.email,
      clienteTelefone: user.telefone,
      servicoId: agendamentos.servicoId,
      servico: servicos.nome,
      duracaoMin: servicos.duracaoMin,
      profissionalId: agendamentos.profissionalId,
      profissional: profissionais.nome,
      profissionalUsuarioId: profissionais.usuarioId,
      comissaoPercentual: profissionais.comissaoPercentual,
    })
    .from(agendamentos)
    .innerJoin(user, eq(user.id, agendamentos.clienteId))
    .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .where(eq(agendamentos.id, id));
  if (!a) return null;
  if (u.papel !== "dona" && a.profissionalUsuarioId !== u.id) return null;

  const [pagamento] = await db
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.agendamentoId, id), eq(lancamentos.categoria, "servico")));
  const [conversa] = await db.select({ id: threads.id }).from(threads).where(eq(threads.agendamentoId, id)).limit(1);
  return { ...a, pagamento: pagamento ?? null, conversaId: conversa?.id ?? null };
}

/** Busca de clientes por nome, e-mail ou telefone (para a recepção). */
export async function buscarClientes(termo: string, limite = 8) {
  const t = termo.trim();
  if (t.length < 2) return [];
  const digitos = t.replace(/\D/g, "");
  return db
    .select({ id: user.id, nome: user.name, email: user.email, telefone: user.telefone })
    .from(user)
    .where(
      and(
        eq(user.papel, "cliente"),
        or(
          ilike(user.name, `%${t}%`),
          ilike(user.email, `%${t}%`),
          digitos.length >= 4 ? ilike(user.telefone, `%${digitos}%`) : undefined,
        ),
      ),
    )
    .orderBy(asc(user.name))
    .limit(limite);
}

export async function obterCliente(id: string) {
  const [c] = await db
    .select({ id: user.id, nome: user.name, email: user.email, telefone: user.telefone })
    .from(user)
    .where(eq(user.id, id));
  return c ?? null;
}

/** Datas (locais) de uma semana a partir de segunda-feira. */
export function semanaDe(data: string) {
  const d = diaDaSemana(data);
  const segunda = somarDias(data, d === 0 ? -6 : 1 - d);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}
