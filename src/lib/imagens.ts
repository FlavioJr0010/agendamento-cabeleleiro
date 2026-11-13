/** Imagens disponíveis em /public/imagens para ilustrar os serviços. */
export const IMAGENS_SERVICO = [
  { arquivo: "servico-corte.webp", rotulo: "Ferramentas de corte" },
  { arquivo: "servico-escova.webp", rotulo: "Escova / finalização" },
  { arquivo: "servico-coloracao.webp", rotulo: "Coloração / mechas" },
  { arquivo: "servico-tratamento.webp", rotulo: "Lavatório / tratamento" },
  { arquivo: "servico-manicure.webp", rotulo: "Manicure / unhas" },
  { arquivo: "servico-maquiagem.webp", rotulo: "Maquiagem" },
  { arquivo: "servico-geral.webp", rotulo: "Pincéis / geral" },
] as const;

const PALAVRAS: [RegExp, string][] = [
  [/colora|mecha|luzes|tint|ombr|balaya/i, "servico-coloracao.webp"],
  [/escova|finaliz|penteado|babyliss|progressiva|alisa/i, "servico-escova.webp"],
  [/hidrat|tratament|cauteriz|reconstru|nutri|lavat|spa/i, "servico-tratamento.webp"],
  [/manicure|pedicure|unha|gel|esmalt/i, "servico-manicure.webp"],
  [/maqui|make|sobrancel|cílio|cilio/i, "servico-maquiagem.webp"],
  [/corte|franja|aparar/i, "servico-corte.webp"],
];

/** Imagem escolhida pela dona ou, na falta, uma sugerida pelo nome do serviço. */
export function imagemDoServico(servico: { nome: string; imagem?: string | null }) {
  const valida = IMAGENS_SERVICO.some((i) => i.arquivo === servico.imagem);
  if (servico.imagem && valida) return `/imagens/${servico.imagem}`;
  const achada = PALAVRAS.find(([re]) => re.test(servico.nome));
  return `/imagens/${achada?.[1] ?? "servico-geral.webp"}`;
}
