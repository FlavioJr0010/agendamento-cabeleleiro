CREATE TYPE "public"."papel_usuario" AS ENUM('cliente', 'profissional', 'dona');--> statement-breakpoint
CREATE TYPE "public"."status_agendamento" AS ENUM('pendente', 'confirmado', 'em_atendimento', 'concluido', 'faltou', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_thread" AS ENUM('aberta', 'aguardando_cliente', 'encerrada');--> statement-breakpoint
CREATE TYPE "public"."tipo_mensagem" AS ENUM('texto', 'sistema');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"telefone" text,
	"papel" "papel_usuario" DEFAULT 'cliente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" text NOT NULL,
	"profissional_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"status" "status_agendamento" DEFAULT 'pendente' NOT NULL,
	"preco_centavos" integer NOT NULL,
	"observacoes" text,
	"criado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agendamentos_inicio_antes_fim" CHECK ("agendamentos"."inicio" < "agendamentos"."fim"),
	CONSTRAINT "agendamentos_preco_nao_negativo" CHECK ("agendamentos"."preco_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bloqueios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bloqueios_inicio_antes_fim" CHECK ("bloqueios"."inicio" < "bloqueios"."fim")
);
--> statement-breakpoint
CREATE TABLE "horarios_trabalho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"inicio" time NOT NULL,
	"fim" time NOT NULL,
	CONSTRAINT "horarios_dia_semana_valido" CHECK ("horarios_trabalho"."dia_semana" between 0 and 6),
	CONSTRAINT "horarios_inicio_antes_fim" CHECK ("horarios_trabalho"."inicio" < "horarios_trabalho"."fim")
);
--> statement-breakpoint
CREATE TABLE "leituras" (
	"thread_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"lida_ate" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leituras_thread_id_usuario_id_pk" PRIMARY KEY("thread_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"autor_id" text,
	"conteudo" text NOT NULL,
	"tipo" "tipo_mensagem" DEFAULT 'texto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mensagens_conteudo_nao_vazio" CHECK (length(trim("mensagens"."conteudo")) > 0)
);
--> statement-breakpoint
CREATE TABLE "profissionais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text,
	"nome" text NOT NULL,
	"bio" text,
	"foto_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profissionais_usuarioId_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "profissional_servicos" (
	"profissional_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	CONSTRAINT "profissional_servicos_profissional_id_servico_id_pk" PRIMARY KEY("profissional_id","servico_id")
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"duracao_min" integer NOT NULL,
	"intervalo_min" integer DEFAULT 0 NOT NULL,
	"preco_centavos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "servicos_duracao_positiva" CHECK ("servicos"."duracao_min" > 0),
	CONSTRAINT "servicos_intervalo_nao_negativo" CHECK ("servicos"."intervalo_min" >= 0),
	CONSTRAINT "servicos_preco_nao_negativo" CHECK ("servicos"."preco_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" text NOT NULL,
	"agendamento_id" uuid,
	"assunto" text NOT NULL,
	"status" "status_thread" DEFAULT 'aberta' NOT NULL,
	"ultima_mensagem_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_user_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios_trabalho" ADD CONSTRAINT "horarios_trabalho_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leituras" ADD CONSTRAINT "leituras_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leituras" ADD CONSTRAINT "leituras_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_cliente_id_user_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "agendamentos_profissional_id_inicio_index" ON "agendamentos" USING btree ("profissional_id","inicio");--> statement-breakpoint
CREATE INDEX "agendamentos_cliente_id_inicio_index" ON "agendamentos" USING btree ("cliente_id","inicio");--> statement-breakpoint
CREATE INDEX "bloqueios_profissional_id_inicio_index" ON "bloqueios" USING btree ("profissional_id","inicio");--> statement-breakpoint
CREATE INDEX "horarios_trabalho_profissional_id_dia_semana_index" ON "horarios_trabalho" USING btree ("profissional_id","dia_semana");--> statement-breakpoint
CREATE INDEX "mensagens_thread_id_created_at_index" ON "mensagens" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_cliente_id_ultima_mensagem_em_index" ON "threads" USING btree ("cliente_id","ultima_mensagem_em");--> statement-breakpoint
CREATE INDEX "threads_status_ultima_mensagem_em_index" ON "threads" USING btree ("status","ultima_mensagem_em");--> statement-breakpoint
CREATE INDEX "threads_agendamento_id_index" ON "threads" USING btree ("agendamento_id");