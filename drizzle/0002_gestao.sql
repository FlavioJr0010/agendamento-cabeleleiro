CREATE TYPE "public"."canal_notificacao" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."categoria_lancamento" AS ENUM('servico', 'produto', 'despesa', 'outro');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('pix', 'dinheiro', 'credito', 'debito', 'outro');--> statement-breakpoint
CREATE TYPE "public"."periodo_dia" AS ENUM('manha', 'tarde', 'qualquer');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimentacao" AS ENUM('entrada', 'saida', 'ajuste', 'consumo', 'venda');--> statement-breakpoint
CREATE TYPE "public"."tipo_produto" AS ENUM('uso_interno', 'revenda', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."unidade_produto" AS ENUM('ml', 'g', 'un');--> statement-breakpoint
CREATE TABLE "configuracoes_salao" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome" text DEFAULT 'Studio Aurora' NOT NULL,
	"slogan" text DEFAULT 'Beleza com hora marcada' NOT NULL,
	"sobre" text,
	"endereco" text,
	"cidade" text,
	"telefone" text,
	"whatsapp" text,
	"instagram" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracoes_linha_unica" CHECK ("configuracoes_salao"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "ficha_tecnica" (
	"servico_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	CONSTRAINT "ficha_tecnica_servico_id_produto_id_pk" PRIMARY KEY("servico_id","produto_id"),
	CONSTRAINT "ficha_quantidade_positiva" CHECK ("ficha_tecnica"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "fichas_clientes" (
	"cliente_id" text PRIMARY KEY NOT NULL,
	"preferencias" text,
	"formula_coloracao" text,
	"alergias" text,
	"observacoes" text,
	"atualizado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"categoria" "categoria_lancamento" NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"forma_pagamento" "forma_pagamento",
	"data" date NOT NULL,
	"agendamento_id" uuid,
	"profissional_id" uuid,
	"comissao_centavos" integer DEFAULT 0 NOT NULL,
	"criado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamento_valor_positivo" CHECK ("lancamentos"."valor_centavos" > 0),
	CONSTRAINT "lancamento_comissao_nao_negativa" CHECK ("lancamentos"."comissao_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lista_espera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" text NOT NULL,
	"servico_id" uuid NOT NULL,
	"profissional_id" uuid,
	"data" date NOT NULL,
	"periodo" "periodo_dia" DEFAULT 'qualquer' NOT NULL,
	"avisado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_estoque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"tipo" "tipo_movimentacao" NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"agendamento_id" uuid,
	"observacao" text,
	"criado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimentacao_nao_zero" CHECK ("movimentacoes_estoque"."quantidade" <> 0)
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"canal" "canal_notificacao" DEFAULT 'email' NOT NULL,
	"tipo" text NOT NULL,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"agendamento_id" uuid,
	"enviar_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone,
	"erro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"marca" text,
	"tipo" "tipo_produto" DEFAULT 'uso_interno' NOT NULL,
	"unidade" "unidade_produto" DEFAULT 'un' NOT NULL,
	"quantidade_atual" numeric(12, 3) DEFAULT 0 NOT NULL,
	"estoque_minimo" numeric(12, 3) DEFAULT 0 NOT NULL,
	"custo_unitario_centavos" numeric(12, 4) DEFAULT 0 NOT NULL,
	"preco_venda_centavos" integer,
	"validade" date,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_minimo_nao_negativo" CHECK ("produtos"."estoque_minimo" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nascimento" date;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "cancelado_por" text;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "motivo_cancelamento" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "comissao_percentual" numeric(5, 2) DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "imagem" text;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "destaque" integer;--> statement-breakpoint
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichas_clientes" ADD CONSTRAINT "fichas_clientes_cliente_id_user_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichas_clientes" ADD CONSTRAINT "fichas_clientes_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_cliente_id_user_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lancamentos_data_index" ON "lancamentos" USING btree ("data");--> statement-breakpoint
CREATE INDEX "lancamentos_profissional_id_data_index" ON "lancamentos" USING btree ("profissional_id","data");--> statement-breakpoint
CREATE INDEX "lista_espera_data_servico_id_index" ON "lista_espera" USING btree ("data","servico_id");--> statement-breakpoint
CREATE INDEX "movimentacoes_estoque_produto_id_created_at_index" ON "movimentacoes_estoque" USING btree ("produto_id","created_at");--> statement-breakpoint
CREATE INDEX "notificacoes_enviado_em_enviar_em_index" ON "notificacoes" USING btree ("enviado_em","enviar_em");--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cancelado_por_user_id_fk" FOREIGN KEY ("cancelado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;