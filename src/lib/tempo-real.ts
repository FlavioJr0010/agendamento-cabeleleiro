import "server-only";
import { Client } from "pg";

/**
 * Tempo real das conversas: UMA conexão dedicada faz `LISTEN nova_mensagem`
 * (o trigger do banco faz o NOTIFY a cada mensagem inserida) e repassa os
 * avisos para todos os navegadores conectados via SSE.
 */
type Evento = { threadId: string; mensagemId: string };
type Ouvinte = (e: Evento) => void;

const global_ = globalThis as unknown as { __ouvintes?: Set<Ouvinte>; __listen?: Promise<Client> | null };
const ouvintes = (global_.__ouvintes ??= new Set());

async function conectar(): Promise<Client> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query("LISTEN nova_mensagem");
  cliente.on("notification", (n) => {
    if (!n.payload) return;
    try {
      const evento = JSON.parse(n.payload) as Evento;
      for (const o of ouvintes) o(evento);
    } catch {
      /* payload inválido: ignora */
    }
  });
  const reconectar = () => {
    global_.__listen = null;
    setTimeout(() => {
      if (ouvintes.size > 0) global_.__listen = conectar().catch(() => null) as Promise<Client>;
    }, 2000);
  };
  cliente.on("error", reconectar);
  cliente.on("end", reconectar);
  return cliente;
}

export function inscrever(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  global_.__listen ??= conectar();
  return () => {
    ouvintes.delete(ouvinte);
  };
}
