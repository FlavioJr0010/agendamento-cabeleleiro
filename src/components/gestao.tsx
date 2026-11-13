import { Suspense, type ReactNode } from "react";
import { CabecalhoPagina, EsqueletoPainel, Selecao } from "./ui";

/** Moldura das telas de gestão: cabeçalho padrão + carregamento. */
export function TelaGestao({
  titulo,
  descricao,
  acoes,
  voltar,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
  children: ReactNode;
}) {
  return (
    <>
      <CabecalhoPagina titulo={titulo} descricao={descricao} acoes={acoes} voltar={voltar} />
      <Suspense fallback={<EsqueletoPainel />}>{children}</Suspense>
    </>
  );
}

/** Seleção obrigatória a partir de registros do banco ({ id, nome }). */
export function Seletor({
  nome,
  rotulo,
  itens,
  id,
  className,
}: {
  nome: string;
  rotulo: string;
  itens: readonly { id: string; nome: string }[];
  /** Id do campo, quando há mais de um seletor com o mesmo nome na página. */
  id?: string;
  className?: string;
}) {
  return (
    <Selecao
      required
      id={id ?? nome}
      name={nome}
      rotulo={rotulo}
      className={className}
      opcoes={itens.map((i) => ({ valor: i.id, rotulo: i.nome }))}
    />
  );
}

export const grade = "grid gap-4 sm:grid-cols-2";

/** Rótulos legíveis para os valores guardados no banco. */
export const ROTULOS = {
  formaPagamento: { pix: "Pix", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito", outro: "Outro" },
  tipoProduto: { uso_interno: "Uso interno", revenda: "Revenda", ambos: "Uso interno e revenda" },
  unidade: { ml: "Mililitros (ml)", g: "Gramas (g)", un: "Unidades (un)" },
  categoria: { servico: "Serviço", produto: "Produto", despesa: "Despesa", outro: "Outro" },
} as const;

/** Converte um mapa de rótulos em opções para <Selecao>. */
export function opcoesDe(mapa: Record<string, string>) {
  return Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));
}
