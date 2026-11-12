/**
 * Conversões entre o horário local do salão e instantes UTC.
 * Datas "locais" são strings "AAAA-MM-DD" e horas são "HH:MM"; instantes são Date (UTC).
 * Usa Intl, então continua correto se o Brasil voltar a ter horário de verão.
 */
import { REGRAS } from "./regras";

const FUSO = REGRAS.fuso;

const formatadorPartes = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partesLocais(instante: Date) {
  const p = Object.fromEntries(formatadorPartes.formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}

/** Diferença (ms) entre o horário local do salão e UTC naquele instante. */
function deslocamento(instante: Date) {
  const p = partesLocais(instante);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

/** "2026-11-17" + "09:30" (horário do salão) → instante UTC. */
export function localParaUtc(data: string, hora: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const ingenuo = Date.UTC(ano, mes - 1, dia, h, m);
  let resultado = ingenuo - deslocamento(new Date(ingenuo));
  // Segunda passada corrige casos perto de mudança de horário de verão.
  resultado = ingenuo - deslocamento(new Date(resultado));
  return new Date(resultado);
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Instante UTC → data local "AAAA-MM-DD". */
export function dataLocal(instante: Date): string {
  const p = partesLocais(instante);
  return `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}`;
}

/** Instante UTC → hora local "HH:MM". */
export function horaLocal(instante: Date): string {
  const p = partesLocais(instante);
  return `${doisDigitos(p.hora)}:${doisDigitos(p.minuto)}`;
}

/** Data de hoje no salão. */
export function hojeNoSalao(agora = new Date()) {
  return dataLocal(agora);
}

/** 0 = domingo … 6 = sábado (independe do fuso, pois é uma data de calendário). */
export function diaDaSemana(data: string) {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function dataValida(data: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && somarDias(data, 0) === data;
}

/** "HH:MM" ou "HH:MM:SS" → minutos desde 00:00 */
export function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number) {
  return `${doisDigitos(Math.floor(minutos / 60))}:${doisDigitos(minutos % 60)}`;
}

// ─── Exibição ────────────────────────────────────────────────────────────────

const fmtDiaCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit" });
const fmtDiaLongo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });

/** "2026-11-17" → { semana: "ter.", dia: "17", mes: "nov." } */
export function partesDia(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  const [semana, dia] = fmtDiaCurto.format(d).split(", ");
  return { semana: semana ?? "", dia: dia ?? "", mes: fmtMes.format(d) };
}

/** "2026-11-17" → "terça-feira, 17 de novembro" */
export function formatarDiaLongo(data: string) {
  return fmtDiaLongo.format(new Date(`${data}T12:00:00Z`));
}

/** Instante → "terça-feira, 17 de novembro, às 09:30" (no horário do salão) */
export function formatarDataHora(instante: Date) {
  return `${formatarDiaLongo(dataLocal(instante))}, às ${horaLocal(instante)}`;
}
