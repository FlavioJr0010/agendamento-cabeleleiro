import type { Pool } from "pg";

type Notificacao = {
  id: string;
  canal: string;
  tipo: string;
  assunto: string;
  corpo: string;
  email: string;
  status: string | null;
  inicio: Date | null;
};
export type EnvioEmail = (n: {
  id: string;
  assunto: string;
  corpo: string;
  email: string;
}) => Promise<void>;

/** Uma transação por mensagem: SKIP LOCKED permite executar mais de um worker. */
export async function processarLembretes(
  pool: Pool,
  enviar: EnvioEmail,
  simular = false,
) {
  const resumo = { enviados: 0, erros: 0, ignorados: 0, pendentes: 0 };
  const client = await pool.connect();
  try {
    const candidatos = await client.query<{ id: string }>(
      `select id from notificacoes where enviado_em is null and enviar_em <= now() order by enviar_em limit 100`,
    );
    resumo.pendentes = candidatos.rowCount ?? 0;
    if (simular) return resumo;
    for (const { id } of candidatos.rows) {
      await client.query("begin");
      try {
        const {
          rows: [n],
        } = await client.query<Notificacao>(
          `
          select n.id, n.canal, n.tipo, n.assunto, n.corpo, u.email, a.status, a.inicio
          from notificacoes n join "user" u on u.id = n.usuario_id
          left join agendamentos a on a.id = n.agendamento_id
          where n.id = $1 and n.enviado_em is null and n.enviar_em <= now()
          for update of n skip locked`,
          [id],
        );
        if (!n) {
          await client.query("commit");
          continue;
        }
        if (
          n.tipo === "lembrete_24h" &&
          (!n.inicio ||
            n.inicio <= new Date() ||
            !["pendente", "confirmado"].includes(n.status ?? ""))
        ) {
          await client.query("delete from notificacoes where id = $1", [id]);
          resumo.ignorados++;
        } else {
          try {
            if (n.canal !== "email")
              throw new Error("Canal ainda não configurado: " + n.canal);
            if (n.email.endsWith("@clientes.local"))
              throw new Error("Cliente sem e-mail de contato.");
            await enviar(n);
            await client.query(
              "update notificacoes set enviado_em = now(), erro = null where id = $1",
              [id],
            );
            resumo.enviados++;
          } catch (erro) {
            await client.query(
              "update notificacoes set erro = $2 where id = $1",
              [
                id,
                (erro instanceof Error ? erro.message : "Falha de envio").slice(
                  0,
                  500,
                ),
              ],
            );
            resumo.erros++;
          }
        }
        await client.query("commit");
      } catch (erro) {
        await client.query("rollback");
        throw erro;
      }
    }
    return resumo;
  } finally {
    client.release();
  }
}

export function criarEnvioResend(
  apiKey: string,
  remetente: string,
): EnvioEmail {
  return async (n) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": n.id,
      },
      body: JSON.stringify({
        from: remetente,
        to: [n.email],
        subject: n.assunto,
        text: n.corpo,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw new Error(`Provedor de e-mail recusou o envio (HTTP ${r.status}).`);
  };
}
