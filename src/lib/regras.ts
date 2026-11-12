/**
 * Regras de agendamento do salão.
 * (Fase futura: mover para uma tabela de configurações editável pela dona.)
 */
export const REGRAS = {
  /** Fuso horário do salão; o expediente é cadastrado neste horário local. */
  fuso: "America/Sao_Paulo",
  /** De quantos em quantos minutos os horários são oferecidos. */
  passoMin: 15,
  /** Antecedência mínima para agendar (minutos). */
  antecedenciaMinimaMin: 60,
  /** Até quantos dias à frente a cliente pode agendar. */
  janelaDias: 30,
  /** Máximo de agendamentos futuros ativos por cliente (evita lotar a agenda com contas falsas). */
  limiteAgendamentosFuturos: 3,
  /** Até quantas horas antes a cliente pode cancelar pelo site. */
  prazoCancelamentoHoras: 2,
} as const;
