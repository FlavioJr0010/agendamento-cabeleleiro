import "server-only";
import { refresh } from "next/cache";
import { z } from "zod";
import { NaoAutorizadoError } from "./sessao";

/** Resultado padrão das Server Actions usadas com <FormAcao>. */
export type EstadoAcao = { ok: true; mensagem?: string } | { ok: false; erro: string } | null;

export const sucesso = (mensagem?: string): EstadoAcao => ({ ok: true, mensagem });
export const falha = (erro: string): EstadoAcao => ({ ok: false, erro });

/** Primeira mensagem de erro do zod, para exibir ao usuário. */
export function erroValidacao(erro: z.ZodError) {
  return falha(erro.issues[0]?.message ?? "Dados inválidos.");
}

/** Códigos de erro do PostgreSQL que viram mensagens amigáveis. */
function codigoPg(erro: unknown): string | undefined {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.cause?.code ?? e?.code;
}

/**
 * Executa a ação, atualiza a tela em caso de sucesso e converte erros
 * conhecidos em mensagens para o formulário.
 */
export async function executarAcao(fn: () => Promise<EstadoAcao>): Promise<EstadoAcao> {
  try {
    const resultado = await fn();
    if (resultado?.ok) refresh();
    return resultado;
  } catch (erro) {
    if (erro instanceof NaoAutorizadoError) return falha(erro.message);
    switch (codigoPg(erro)) {
      case "23505":
        return falha("Já existe um registro com esses dados.");
      case "23503":
        return falha("Este registro está em uso e não pode ser alterado assim.");
      case "23514":
        return falha("Algum valor está fora do permitido.");
      case "23P01": // exclusion constraint: horário sobreposto (regra de ouro)
        return falha("Esse horário acabou de ser ocupado. Por favor, escolha outro.");
      case "22P02": // id em formato inválido
        return falha("Registro não encontrado.");
    }
    console.error(erro);
    return falha("Erro inesperado. Tente novamente.");
  }
}
