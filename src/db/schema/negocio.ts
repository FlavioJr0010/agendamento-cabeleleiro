/**
 * Gestão do negócio: configurações do salão, ficha de clientes, estoque,
 * caixa/comissões, lista de espera e fila de notificações.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { agendamentos, profissionais, servicos } from "./salao";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const quantidade = (nome?: string) =>
  nome
    ? numeric(nome, { precision: 12, scale: 3, mode: "number" })
    : numeric({ precision: 12, scale: 3, mode: "number" });

// ─── Configurações (linha única) ─────────────────────────────────────────────

export const configuracoesSalao = pgTable(
  "configuracoes_salao",
  {
    id: integer().primaryKey().default(1),
    nome: text().notNull().default("Studio Aurora"),
    slogan: text().notNull().default("Beleza com hora marcada"),
    sobre: text(),
    endereco: text(),
    cidade: text(),
    telefone: text(),
    whatsapp: text(),
    instagram: text(),
    email: text(),
    ...timestamps,
  },
  (t) => [check("configuracoes_linha_unica", sql`${t.id} = 1`)],
);

// ─── Clientes ────────────────────────────────────────────────────────────────

/** Ficha da cliente (uso interno da equipe). Alergias são dado sensível (LGPD). */
export const fichasClientes = pgTable("fichas_clientes", {
  clienteId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferencias: text(),
  formulaColoracao: text(),
  alergias: text(),
  observacoes: text(),
  atualizadoPor: text().references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

// ─── Estoque ─────────────────────────────────────────────────────────────────

export const tipoProduto = pgEnum("tipo_produto", ["uso_interno", "revenda", "ambos"]);
export const unidadeProduto = pgEnum("unidade_produto", ["ml", "g", "un"]);
export const tipoMovimentacao = pgEnum("tipo_movimentacao", ["entrada", "saida", "ajuste", "consumo", "venda"]);

export const produtos = pgTable(
  "produtos",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    marca: text(),
    tipo: tipoProduto().notNull().default("uso_interno"),
    unidade: unidadeProduto().notNull().default("un"),
    /** Saldo atual na unidade do produto (mantido pelas movimentações). */
    quantidadeAtual: quantidade().notNull().default(0),
    estoqueMinimo: quantidade().notNull().default(0),
    /** Custo por unidade (ml, g ou un), em centavos — pode ter frações. */
    custoUnitarioCentavos: numeric({ precision: 12, scale: 4, mode: "number" }).notNull().default(0),
    /** Preço de venda por unidade (apenas revenda). */
    precoVendaCentavos: integer(),
    validade: date({ mode: "string" }),
    ativo: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [check("produtos_minimo_nao_negativo", sql`${t.estoqueMinimo} >= 0`)],
);

export const movimentacoesEstoque = pgTable(
  "movimentacoes_estoque",
  {
    id: uuid().primaryKey().defaultRandom(),
    produtoId: uuid()
      .notNull()
      .references(() => produtos.id, { onDelete: "cascade" }),
    tipo: tipoMovimentacao().notNull(),
    /** Positivo = entrou no estoque; negativo = saiu. */
    quantidade: quantidade().notNull(),
    agendamentoId: uuid().references(() => agendamentos.id, { onDelete: "set null" }),
    observacao: text(),
    criadoPor: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.produtoId, t.createdAt), check("movimentacao_nao_zero", sql`${t.quantidade} <> 0`)],
);

/** Ficha técnica: quanto de cada produto um serviço consome (baixa automática ao concluir). */
export const fichaTecnica = pgTable(
  "ficha_tecnica",
  {
    servicoId: uuid()
      .notNull()
      .references(() => servicos.id, { onDelete: "cascade" }),
    produtoId: uuid()
      .notNull()
      .references(() => produtos.id, { onDelete: "cascade" }),
    quantidade: quantidade().notNull(),
  },
  (t) => [primaryKey({ columns: [t.servicoId, t.produtoId] }), check("ficha_quantidade_positiva", sql`${t.quantidade} > 0`)],
);

// ─── Financeiro ──────────────────────────────────────────────────────────────

export const tipoLancamento = pgEnum("tipo_lancamento", ["entrada", "saida"]);
export const categoriaLancamento = pgEnum("categoria_lancamento", ["servico", "produto", "despesa", "outro"]);
export const formaPagamento = pgEnum("forma_pagamento", ["pix", "dinheiro", "credito", "debito", "outro"]);

export const lancamentos = pgTable(
  "lancamentos",
  {
    id: uuid().primaryKey().defaultRandom(),
    tipo: tipoLancamento().notNull(),
    categoria: categoriaLancamento().notNull(),
    descricao: text().notNull(),
    valorCentavos: integer().notNull(),
    formaPagamento: formaPagamento(),
    /** Data de competência (dia do caixa), horário local do salão. */
    data: date({ mode: "string" }).notNull(),
    agendamentoId: uuid().references(() => agendamentos.id, { onDelete: "set null" }),
    profissionalId: uuid().references(() => profissionais.id, { onDelete: "set null" }),
    /** Comissão congelada no momento do lançamento. */
    comissaoCentavos: integer().notNull().default(0),
    criadoPor: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.data),
    index().on(t.profissionalId, t.data),
    check("lancamento_valor_positivo", sql`${t.valorCentavos} > 0`),
    check("lancamento_comissao_nao_negativa", sql`${t.comissaoCentavos} >= 0`),
  ],
);

// ─── Lista de espera ─────────────────────────────────────────────────────────

export const periodoDia = pgEnum("periodo_dia", ["manha", "tarde", "qualquer"]);

export const listaEspera = pgTable(
  "lista_espera",
  {
    id: uuid().primaryKey().defaultRandom(),
    clienteId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    servicoId: uuid()
      .notNull()
      .references(() => servicos.id, { onDelete: "cascade" }),
    profissionalId: uuid().references(() => profissionais.id, { onDelete: "cascade" }),
    data: date({ mode: "string" }).notNull(),
    periodo: periodoDia().notNull().default("qualquer"),
    avisadoEm: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.data, t.servicoId)],
);

// ─── Notificações (fila de envio) ────────────────────────────────────────────

export const canalNotificacao = pgEnum("canal_notificacao", ["email", "whatsapp"]);

export const notificacoes = pgTable(
  "notificacoes",
  {
    id: uuid().primaryKey().defaultRandom(),
    usuarioId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    canal: canalNotificacao().notNull().default("email"),
    /** Ex.: "lembrete_24h", "confirmacao", "vaga_lista_espera". */
    tipo: text().notNull(),
    assunto: text().notNull(),
    corpo: text().notNull(),
    agendamentoId: uuid().references(() => agendamentos.id, { onDelete: "cascade" }),
    enviarEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    enviadoEm: timestamp({ withTimezone: true }),
    erro: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.enviadoEm, t.enviarEm)],
);
