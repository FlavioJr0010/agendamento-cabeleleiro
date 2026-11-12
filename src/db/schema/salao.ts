/**
 * Domínio do salão: serviços, profissionais, agenda e conversas (threads).
 *
 * Regras de ouro garantidas no banco (ver drizzle/*_regras_agendamento.sql):
 * - nenhuma profissional com dois agendamentos sobrepostos;
 * - nenhuma cliente com dois agendamentos sobrepostos.
 * Agendamentos cancelados ou com falta não ocupam a agenda.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const statusAgendamento = pgEnum("status_agendamento", [
  "pendente",
  "confirmado",
  "em_atendimento",
  "concluido",
  "faltou",
  "cancelado",
]);

export const statusThread = pgEnum("status_thread", [
  "aberta",
  "aguardando_cliente",
  "encerrada",
]);

export const tipoMensagem = pgEnum("tipo_mensagem", ["texto", "sistema"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Catálogo ────────────────────────────────────────────────────────────────

export const servicos = pgTable(
  "servicos",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    descricao: text(),
    /** Duração do atendimento em minutos. */
    duracaoMin: integer().notNull(),
    /** Intervalo de preparação/limpeza após o atendimento, em minutos. */
    intervaloMin: integer().notNull().default(0),
    /** Preço em centavos (evita erros de arredondamento). */
    precoCentavos: integer().notNull(),
    ativo: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check("servicos_duracao_positiva", sql`${t.duracaoMin} > 0`),
    check("servicos_intervalo_nao_negativo", sql`${t.intervaloMin} >= 0`),
    check("servicos_preco_nao_negativo", sql`${t.precoCentavos} >= 0`),
  ],
);

export const profissionais = pgTable("profissionais", {
  id: uuid().primaryKey().defaultRandom(),
  /** Login da profissional (opcional: pode existir antes de ter acesso). */
  usuarioId: text()
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  nome: text().notNull(),
  bio: text(),
  fotoUrl: text(),
  ativo: boolean().notNull().default(true),
  ...timestamps,
});

/** Quais serviços cada profissional sabe fazer. */
export const profissionalServicos = pgTable(
  "profissional_servicos",
  {
    profissionalId: uuid()
      .notNull()
      .references(() => profissionais.id, { onDelete: "cascade" }),
    servicoId: uuid()
      .notNull()
      .references(() => servicos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.profissionalId, t.servicoId] })],
);

// ─── Agenda ──────────────────────────────────────────────────────────────────

/** Expediente semanal. Horários locais do salão (America/Sao_Paulo). */
export const horariosTrabalho = pgTable(
  "horarios_trabalho",
  {
    id: uuid().primaryKey().defaultRandom(),
    profissionalId: uuid()
      .notNull()
      .references(() => profissionais.id, { onDelete: "cascade" }),
    /** 0 = domingo … 6 = sábado */
    diaSemana: smallint().notNull(),
    inicio: time().notNull(),
    fim: time().notNull(),
  },
  (t) => [
    index().on(t.profissionalId, t.diaSemana),
    check("horarios_dia_semana_valido", sql`${t.diaSemana} between 0 and 6`),
    check("horarios_inicio_antes_fim", sql`${t.inicio} < ${t.fim}`),
  ],
);

/** Folgas, almoço, férias, feriados… */
export const bloqueios = pgTable(
  "bloqueios",
  {
    id: uuid().primaryKey().defaultRandom(),
    profissionalId: uuid()
      .notNull()
      .references(() => profissionais.id, { onDelete: "cascade" }),
    inicio: timestamp({ withTimezone: true }).notNull(),
    fim: timestamp({ withTimezone: true }).notNull(),
    motivo: text(),
    ...timestamps,
  },
  (t) => [
    index().on(t.profissionalId, t.inicio),
    check("bloqueios_inicio_antes_fim", sql`${t.inicio} < ${t.fim}`),
  ],
);

export const agendamentos = pgTable(
  "agendamentos",
  {
    id: uuid().primaryKey().defaultRandom(),
    clienteId: text()
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    profissionalId: uuid()
      .notNull()
      .references(() => profissionais.id, { onDelete: "restrict" }),
    servicoId: uuid()
      .notNull()
      .references(() => servicos.id, { onDelete: "restrict" }),
    inicio: timestamp({ withTimezone: true }).notNull(),
    /** Fim do bloco ocupado = início + duração + intervalo do serviço. */
    fim: timestamp({ withTimezone: true }).notNull(),
    status: statusAgendamento().notNull().default("pendente"),
    /** Preço congelado no momento do agendamento. */
    precoCentavos: integer().notNull(),
    observacoes: text(),
    /** Quem criou (a própria cliente ou alguém da equipe). */
    criadoPor: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index().on(t.profissionalId, t.inicio),
    index().on(t.clienteId, t.inicio),
    check("agendamentos_inicio_antes_fim", sql`${t.inicio} < ${t.fim}`),
    check("agendamentos_preco_nao_negativo", sql`${t.precoCentavos} >= 0`),
  ],
);

// ─── Conversação ─────────────────────────────────────────────────────────────

export const threads = pgTable(
  "threads",
  {
    id: uuid().primaryKey().defaultRandom(),
    clienteId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Opcional: thread sobre um agendamento específico. */
    agendamentoId: uuid().references(() => agendamentos.id, { onDelete: "set null" }),
    assunto: text().notNull(),
    status: statusThread().notNull().default("aberta"),
    ultimaMensagemEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index().on(t.clienteId, t.ultimaMensagemEm),
    index().on(t.status, t.ultimaMensagemEm),
    index().on(t.agendamentoId),
  ],
);

export const mensagens = pgTable(
  "mensagens",
  {
    id: uuid().primaryKey().defaultRandom(),
    threadId: uuid()
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    /** Nulo apenas em mensagens automáticas do sistema. */
    autorId: text().references(() => user.id, { onDelete: "set null" }),
    conteudo: text().notNull(),
    tipo: tipoMensagem().notNull().default("texto"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.threadId, t.createdAt),
    check("mensagens_conteudo_nao_vazio", sql`length(trim(${t.conteudo})) > 0`),
  ],
);

/** Até onde cada usuário leu cada thread (contador de não lidas). */
export const leituras = pgTable(
  "leituras",
  {
    threadId: uuid()
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    usuarioId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lidaAte: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.usuarioId] })],
);
