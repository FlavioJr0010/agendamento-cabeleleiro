import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Papel } from "./auth";

/** Sessão atual (ou null) — para uso em Server Components e Server Actions. */
export async function obterSessao() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Para páginas: exige login e, opcionalmente, um dos papéis informados.
 * Sem login → /entrar. Papel não permitido → página inicial.
 * Deve ser chamada dentro de um <Suspense> (lê cookies da requisição).
 */
export async function exigirSessao(papeis?: Papel[]) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar");
  if (papeis && !papeis.includes(sessao.user.papel as Papel)) redirect("/");
  return sessao;
}

export class NaoAutorizadoError extends Error {
  constructor() {
    super("Você não tem permissão para esta ação.");
  }
}

/**
 * Para Server Actions: toda ação precisa checar permissão por conta própria,
 * pois pode ser chamada diretamente, sem passar pela página.
 */
export async function autorizarAcao(papeis: Papel[]) {
  const sessao = await obterSessao();
  if (!sessao || !papeis.includes(sessao.user.papel as Papel)) {
    throw new NaoAutorizadoError();
  }
  return sessao;
}
