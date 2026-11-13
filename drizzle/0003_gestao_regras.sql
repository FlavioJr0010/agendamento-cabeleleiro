-- Linha única de configurações do salão (editável pela dona no painel).
INSERT INTO "configuracoes_salao" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Saldo do estoque sempre derivado das movimentações (não dá para "esquecer" de atualizar).
CREATE OR REPLACE FUNCTION "fn_movimentacao_estoque"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "produtos" SET "quantidade_atual" = "quantidade_atual" + NEW."quantidade", "updated_at" = now()
     WHERE "id" = NEW."produto_id";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "produtos" SET "quantidade_atual" = "quantidade_atual" - OLD."quantidade", "updated_at" = now()
     WHERE "id" = OLD."produto_id";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER "trg_movimentacao_estoque"
  AFTER INSERT OR DELETE ON "movimentacoes_estoque"
  FOR EACH ROW EXECUTE FUNCTION "fn_movimentacao_estoque"();
--> statement-breakpoint

-- Um agendamento gera no máximo um lançamento de serviço no caixa.
CREATE UNIQUE INDEX "lancamentos_um_por_agendamento"
  ON "lancamentos" ("agendamento_id") WHERE "categoria" = 'servico' AND "agendamento_id" IS NOT NULL;
--> statement-breakpoint

-- Consumo da ficha técnica é lançado uma única vez por agendamento e produto.
CREATE UNIQUE INDEX "movimentacoes_consumo_unico"
  ON "movimentacoes_estoque" ("agendamento_id", "produto_id") WHERE "tipo" = 'consumo';
--> statement-breakpoint

-- Uma notificação de cada tipo por agendamento (evita lembretes duplicados).
CREATE UNIQUE INDEX "notificacoes_tipo_por_agendamento"
  ON "notificacoes" ("agendamento_id", "tipo") WHERE "agendamento_id" IS NOT NULL;
