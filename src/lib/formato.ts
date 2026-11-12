/** Utilitários de formatação e conversão (podem rodar no servidor e no navegador). */

export const DIAS_SEMANA = [
  { valor: 0, curto: "Dom", nome: "Domingo" },
  { valor: 1, curto: "Seg", nome: "Segunda" },
  { valor: 2, curto: "Ter", nome: "Terça" },
  { valor: 3, curto: "Qua", nome: "Quarta" },
  { valor: 4, curto: "Qui", nome: "Quinta" },
  { valor: 5, curto: "Sex", nome: "Sexta" },
  { valor: 6, curto: "Sáb", nome: "Sábado" },
] as const;

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 8000 → "R$ 80,00" */
export function formatarPreco(centavos: number) {
  return moeda.format(centavos / 100);
}

/** 8000 → "80,00" (para preencher campos de formulário) */
export function precoParaCampo(centavos: number) {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Converte o texto digitado em centavos.
 * Aceita "80", "80,5", "80,50", "1.234,56", "R$ 80,00", "80.50".
 * Retorna null se não for um valor válido.
 */
export function precoParaCentavos(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo) return null;
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

/** 90 → "1h30", 45 → "45 min", 120 → "2h" */
export function formatarDuracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "09:00:00" → "09:00" */
export function formatarHora(hora: string) {
  return hora.slice(0, 5);
}
