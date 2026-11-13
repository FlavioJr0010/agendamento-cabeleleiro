import "server-only";
import { and, asc, desc, eq, gt, inArray, lt, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agendamentos,
  bloqueios,
  horariosTrabalho,
  profissionais,
  profissionalServicos,
  servicos,
} from "@/db/schema";
import { calcularHorarios, type Horario } from "@/lib/disponibilidade";
import { diaDaSemana, localParaUtc, somarDias } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";

/** Status que NÃO ocupam a agenda. */
export const STATUS_LIVRES = ["cancelado", "faltou"] as const;

/** Profissional pode atender: ativa, faz o serviço e tem expediente cadastrado. */
const profissionalAtende = (servicoId: unknown) => sql`
  ${profissionais.ativo}
  and exists (select 1 from ${profissionalServicos}
              where ${profissionalServicos.profissionalId} = ${profissionais.id}
                and ${profissionalServicos.servicoId} = ${servicoId})
  and exists (select 1 from ${horariosTrabalho}
              where ${horariosTrabalho.profissionalId} = ${profissionais.id})`;

/** Serviços que a cliente consegue agendar (ativos e com alguém para atender). */
export async function listarServicosDisponiveis() {
  return db
    .select({
      id: servicos.id,
      nome: servicos.nome,
      descricao: servicos.descricao,
      duracaoMin: servicos.duracaoMin,
      precoCentavos: servicos.precoCentavos,
      imagem: servicos.imagem,
    })
    .from(servicos)
    .where(
      and(
        eq(servicos.ativo, true),
        sql`exists (select 1 from ${profissionais} where ${profissionalAtende(servicos.id)})`,
      ),
    )
    .orderBy(asc(servicos.nome));
}

export async function obterServicoAtivo(id: string) {
  const [s] = await db
    .select()
    .from(servicos)
    .where(and(eq(servicos.id, id), eq(servicos.ativo, true)));
  return s ?? null;
}

/** Profissionais que fazem o serviço, com os dias da semana em que atendem. */
export async function listarProfissionaisDoServico(servicoId: string) {
  const linhas = await db
    .select({
      id: profissionais.id,
      nome: profissionais.nome,
      bio: profissionais.bio,
      // Subselect nos campos: nomes explícitos (o Drizzle não qualifica colunas aqui).
      dias: sql<number[]>`array(select distinct ht.dia_semana from horarios_trabalho ht
                                where ht.profissional_id = "profissionais"."id")`,
    })
    .from(profissionais)
    .where(profissionalAtende(servicoId))
    .orderBy(asc(profissionais.nome));
  return linhas.map((l) => ({ ...l, dias: new Set(l.dias.map(Number)) }));
}

/** Equipe para a página pública: profissionais ativas com expediente e seus serviços. */
export async function listarEquipe() {
  return db
    .select({
      id: profissionais.id,
      nome: profissionais.nome,
      bio: profissionais.bio,
      servicos: sql<string[]>`array(
        select s.nome from profissional_servicos ps
        join servicos s on s.id = ps.servico_id
        where ps.profissional_id = "profissionais"."id" and s.ativo
        order by s.nome)`,
    })
    .from(profissionais)
    .where(
      and(
        eq(profissionais.ativo, true),
        sql`exists (select 1 from ${horariosTrabalho} where ${horariosTrabalho.profissionalId} = ${profissionais.id})`,
      ),
    )
    .orderBy(asc(profissionais.nome));
}

/**
 * Horários livres de um serviço numa data.
 * @param profissionalId uma profissional específica, ou null para "qualquer".
 * @param clienteId se informado, remove horários que conflitam com outros agendamentos dela.
 */
export async function buscarDisponibilidade(opcoes: {
  servicoId: string;
  profissionalId: string | null;
  data: string;
  clienteId?: string;
  agora?: Date;
  /** Ao remarcar: desconsidera o próprio agendamento. */
  ignorarAgendamentoId?: string;
  /** A equipe pode agendar sem a antecedência mínima exigida das clientes. */
  antecedenciaMin?: number;
}): Promise<{ horarios: Horario[]; duracaoMin: number; intervaloMin: number } | null> {
  const { servicoId, profissionalId, data, clienteId, agora = new Date(), ignorarAgendamentoId } = opcoes;
  const semEle = ignorarAgendamentoId ? ne(agendamentos.id, ignorarAgendamentoId) : undefined;
  const servico = await obterServicoAtivo(servicoId);
  if (!servico) return null;

  const elegiveis = await db
    .select({ id: profissionais.id })
    .from(profissionais)
    .where(and(profissionalAtende(servicoId), profissionalId ? eq(profissionais.id, profissionalId) : undefined));
  const ids = elegiveis.map((p) => p.id);
  const vazio = { horarios: [], duracaoMin: servico.duracaoMin, intervaloMin: servico.intervaloMin };
  if (ids.length === 0) return vazio;

  const inicioDia = localParaUtc(data, "00:00");
  const fimDia = localParaUtc(somarDias(data, 1), "00:00");

  const [faixas, ags, blqs, doCliente] = await Promise.all([
    db
      .select({
        profissionalId: horariosTrabalho.profissionalId,
        inicio: horariosTrabalho.inicio,
        fim: horariosTrabalho.fim,
      })
      .from(horariosTrabalho)
      .where(and(inArray(horariosTrabalho.profissionalId, ids), eq(horariosTrabalho.diaSemana, diaDaSemana(data)))),
    db
      .select({ profissionalId: agendamentos.profissionalId, inicio: agendamentos.inicio, fim: agendamentos.fim })
      .from(agendamentos)
      .where(
        and(
          inArray(agendamentos.profissionalId, ids),
          notInArray(agendamentos.status, [...STATUS_LIVRES]),
          lt(agendamentos.inicio, fimDia),
          gt(agendamentos.fim, inicioDia),
          semEle,
        ),
      ),
    db
      .select({ profissionalId: bloqueios.profissionalId, inicio: bloqueios.inicio, fim: bloqueios.fim })
      .from(bloqueios)
      .where(and(inArray(bloqueios.profissionalId, ids), lt(bloqueios.inicio, fimDia), gt(bloqueios.fim, inicioDia))),
    clienteId
      ? db
          .select({ inicio: agendamentos.inicio, fim: agendamentos.fim })
          .from(agendamentos)
          .where(
            and(
              eq(agendamentos.clienteId, clienteId),
              notInArray(agendamentos.status, [...STATUS_LIVRES]),
              lt(agendamentos.inicio, fimDia),
              gt(agendamentos.fim, inicioDia),
              semEle,
            ),
          )
      : Promise.resolve([]),
  ]);

  const horarios = calcularHorarios({
    data,
    duracaoMin: servico.duracaoMin,
    intervaloMin: servico.intervaloMin,
    faixas,
    ocupados: [...ags, ...blqs],
    ocupadosCliente: doCliente,
    agora,
    passoMin: REGRAS.passoMin,
    antecedenciaMin: opcoes.antecedenciaMin ?? REGRAS.antecedenciaMinimaMin,
  });
  return { horarios, duracaoMin: servico.duracaoMin, intervaloMin: servico.intervaloMin };
}

/** Quantos agendamentos futuros ativos a cliente tem. */
export async function contarAgendamentosFuturos(clienteId: string, agora = new Date()) {
  const [r] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(agendamentos)
    .where(
      and(
        eq(agendamentos.clienteId, clienteId),
        notInArray(agendamentos.status, [...STATUS_LIVRES, "concluido"]),
        gt(agendamentos.inicio, agora),
      ),
    );
  return r.total;
}

export async function listarAgendamentosDaCliente(clienteId: string, agora = new Date()) {
  const todos = await db
    .select({
      id: agendamentos.id,
      inicio: agendamentos.inicio,
      status: agendamentos.status,
      precoCentavos: agendamentos.precoCentavos,
      observacoes: agendamentos.observacoes,
      servicoId: agendamentos.servicoId,
      servico: servicos.nome,
      duracaoMin: servicos.duracaoMin,
      profissionalId: agendamentos.profissionalId,
      profissional: profissionais.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .where(eq(agendamentos.clienteId, clienteId))
    .orderBy(desc(agendamentos.inicio));

  const ms = agora.getTime();
  const ativo = (s: string) => s === "pendente" || s === "confirmado" || s === "em_atendimento";
  const prazo = REGRAS.prazoCancelamentoHoras * 3_600_000;
  // "Próximos" inclui atendimentos que começaram há pouco (ainda em andamento).
  const proximos = todos
    .filter((a) => ativo(a.status) && a.inicio.getTime() >= ms - 3 * 3_600_000)
    .reverse()
    .map((a) => ({
      ...a,
      podeCancelar: (a.status === "pendente" || a.status === "confirmado") && a.inicio.getTime() - ms > prazo,
    }));
  const historico = todos.filter((a) => !proximos.some((p) => p.id === a.id));
  return { proximos, historico };
}
