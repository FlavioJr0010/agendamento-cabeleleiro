"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { agendamentos, mensagens, threads } from "@/db/schema";
import { marcarComoLida, podeAcessarThread } from "@/db/consultas/mensagens";
import { erroValidacao, executarAcao, falha, sucesso, type EstadoAcao } from "./acao";
import { autorizarAcao } from "./sessao";

const TODOS = ["cliente", "profissional", "dona"] as const;
const conteudo = z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Mensagem muito longa (máx. 2000).");

/** Cliente abre uma conversa com o salão (geral ou sobre um agendamento dela). */
export async function iniciarConversa(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let novaId: string | undefined;
  const r = await executarAcao(async () => {
    const { user } = await autorizarAcao([...TODOS]);
    const dados = z
      .object({
        assunto: z.string().trim().min(3, "Informe o assunto.").max(120, "Assunto muito longo."),
        mensagem: conteudo,
        agendamentoId: z.union([z.uuid(), z.literal("")]).optional(),
      })
      .safeParse({
        assunto: formData.get("assunto") ?? "",
        mensagem: formData.get("mensagem") ?? "",
        agendamentoId: formData.get("agendamentoId") ?? "",
      });
    if (!dados.success) return erroValidacao(dados.error);

    let agendamentoId: string | null = null;
    if (dados.data.agendamentoId) {
      const [ag] = await db
        .select({ id: agendamentos.id })
        .from(agendamentos)
        .where(and(eq(agendamentos.id, dados.data.agendamentoId), eq(agendamentos.clienteId, user.id)));
      if (!ag) return falha("Agendamento não encontrado.");
      agendamentoId = ag.id;
    }

    novaId = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(threads)
        .values({ clienteId: user.id, agendamentoId, assunto: dados.data.assunto })
        .returning({ id: threads.id });
      await tx.insert(mensagens).values({ threadId: t.id, autorId: user.id, conteudo: dados.data.mensagem });
      return t.id;
    });
    await marcarComoLida(user.id, novaId);
    return sucesso();
  });
  if (r?.ok && novaId) redirect(`/mensagens/${novaId}`);
  return r;
}

export async function enviarMensagem(threadId: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    const { user } = await autorizarAcao([...TODOS]);
    const texto = conteudo.safeParse(formData.get("conteudo") ?? "");
    if (!texto.success) return erroValidacao(texto.error);

    const t = await podeAcessarThread(user, threadId);
    if (!t) return falha("Conversa não encontrada.");

    const daEquipe = user.papel === "dona" || user.papel === "profissional";
    await db.insert(mensagens).values({ threadId, autorId: user.id, conteudo: texto.data });
    await db
      .update(threads)
      .set({ status: daEquipe ? "aguardando_cliente" : "aberta" })
      .where(eq(threads.id, threadId));
    await marcarComoLida(user.id, threadId);
    return sucesso();
  });
}

export async function lerConversa(threadId: string) {
  const { user } = await autorizarAcao([...TODOS]).catch(() => ({ user: null }));
  if (!user) return;
  if (await podeAcessarThread(user, threadId)) await marcarComoLida(user.id, threadId);
}

export async function alterarStatusConversa(threadId: string, status: "aberta" | "encerrada") {
  return executarAcao(async () => {
    const { user } = await autorizarAcao(["dona", "profissional"]);
    if (!(await podeAcessarThread(user, threadId))) return falha("Conversa não encontrada.");
    await db.update(threads).set({ status }).where(eq(threads.id, threadId));
    return sucesso(status === "encerrada" ? "Conversa encerrada." : "Conversa reaberta.");
  });
}
