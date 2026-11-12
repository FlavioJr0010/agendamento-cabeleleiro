-- Regras de ouro da agenda, garantidas pelo próprio banco
-- (funcionam mesmo com duas pessoas tentando o mesmo horário ao mesmo tempo).

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

-- 1. A mesma profissional não pode ter dois agendamentos sobrepostos.
ALTER TABLE "agendamentos"
  ADD CONSTRAINT "agendamentos_sem_conflito_profissional"
  EXCLUDE USING gist (
    "profissional_id" WITH =,
    tstzrange("inicio", "fim", '[)') WITH &&
  ) WHERE ("status" NOT IN ('cancelado', 'faltou'));
--> statement-breakpoint

-- 2. A mesma cliente não pode ter dois agendamentos sobrepostos.
ALTER TABLE "agendamentos"
  ADD CONSTRAINT "agendamentos_sem_conflito_cliente"
  EXCLUDE USING gist (
    "cliente_id" WITH =,
    tstzrange("inicio", "fim", '[)') WITH &&
  ) WHERE ("status" NOT IN ('cancelado', 'faltou'));
--> statement-breakpoint

-- 3. Conversação: ao inserir mensagem, atualiza a thread e avisa ouvintes
--    (LISTEN nova_mensagem) para entrega em tempo real via SSE.
CREATE OR REPLACE FUNCTION "fn_mensagem_inserida"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "threads"
     SET "ultima_mensagem_em" = NEW."created_at",
         "updated_at" = now()
   WHERE "id" = NEW."thread_id";

  PERFORM pg_notify(
    'nova_mensagem',
    json_build_object('threadId', NEW."thread_id", 'mensagemId', NEW."id")::text
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER "trg_mensagem_inserida"
  AFTER INSERT ON "mensagens"
  FOR EACH ROW EXECUTE FUNCTION "fn_mensagem_inserida"();
