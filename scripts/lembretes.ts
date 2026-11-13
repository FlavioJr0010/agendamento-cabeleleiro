import { Pool } from "pg";
import {
  criarEnvioResend,
  processarLembretes,
} from "../src/lib/processar-lembretes";

async function main() {
  const simular = process.argv.includes("--simular");
  if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL.");
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.LEMBRETES_REMETENTE;
  if (!simular && (!chave || !remetente))
    throw new Error(
      "Configure RESEND_API_KEY e LEMBRETES_REMETENTE. Para consultar sem enviar, use --simular.",
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await processarLembretes(
      pool,
      criarEnvioResend(chave ?? "", remetente ?? ""),
      simular,
    );
    console.log(
      simular ? "Simulação (nenhuma mensagem enviada):" : "Fila processada:",
      r,
    );
    if (r.erros) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main().catch((erro) => {
  console.error(
    erro instanceof Error ? erro.message : "Falha ao processar fila.",
  );
  process.exitCode = 1;
});
