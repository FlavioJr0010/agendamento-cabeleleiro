/** Apoio à renderização da grade da agenda (sem dependências de servidor). */
import { hojeNoSalao, horaLocal, horaParaMinutos } from "./fuso";

export const STATUS_AGENDAMENTO = {
  pendente: { rotulo: "Pendente", cor: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/40", tom: "alerta" },
  confirmado: { rotulo: "Confirmado", cor: "border-l-primary bg-primary-soft", tom: "sucesso" },
  em_atendimento: { rotulo: "Em atendimento", cor: "border-l-violet-500 bg-violet-50 dark:bg-violet-950/40", tom: "sucesso" },
  concluido: { rotulo: "Concluído", cor: "border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", tom: "sucesso" },
  faltou: { rotulo: "Não compareceu", cor: "border-l-zinc-400 bg-surface opacity-70", tom: "neutro" },
  cancelado: { rotulo: "Cancelado", cor: "border-l-zinc-400 bg-surface opacity-60", tom: "neutro" },
} as const;

export type StatusAgendamento = keyof typeof STATUS_AGENDAMENTO;

/** Minutos desde 00:00 (horário do salão) de um instante. */
export function minutosLocais(instante: Date) {
  return horaParaMinutos(horaLocal(instante));
}

/** Minuto atual no salão, ou null se `data` não for hoje (linha do "agora"). */
export function minutoAgoraSe(data: string) {
  return data === hojeNoSalao() ? minutosLocais(new Date()) : null;
}

/** Janela visível da grade, arredondada para horas cheias. */
export function janelaDoDia(faixas: { inicio: string; fim: string }[]) {
  if (faixas.length === 0) return { inicio: 8 * 60, fim: 19 * 60 };
  const ini = Math.min(...faixas.map((f) => horaParaMinutos(f.inicio)));
  const fim = Math.max(...faixas.map((f) => horaParaMinutos(f.fim)));
  return { inicio: Math.floor(ini / 60) * 60, fim: Math.ceil(fim / 60) * 60 };
}
