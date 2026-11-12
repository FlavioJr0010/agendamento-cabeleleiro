/**
 * Valida o parâmetro ?voltar= usado após login/cadastro.
 * Só aceita caminhos internos ("/agendar?...") — nunca outro site ("//x.com", "https://…").
 */
export function destinoSeguro(valor: string | null | undefined, padrao = "/conta") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return padrao;
  return valor;
}
