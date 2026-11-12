/**
 * Cálculo de horários livres — função pura (sem banco), coberta por testes.
 *
 * Regras de ouro aplicadas:
 * - respeita o expediente de cada profissional (faixas do dia da semana);
 * - considera a duração do serviço (o atendimento precisa caber na faixa);
 * - o bloco ocupado = duração + intervalo de preparação;
 * - não sobrepõe agendamentos/bloqueios da profissional;
 * - não sobrepõe outros agendamentos da própria cliente;
 * - respeita a antecedência mínima.
 */
import { horaParaMinutos, localParaUtc, minutosParaHora } from "./fuso";

export type Faixa = { profissionalId: string; inicio: string; fim: string };
export type Intervalo = { inicio: Date; fim: Date };
export type IntervaloProfissional = Intervalo & { profissionalId: string };

export type EntradaDisponibilidade = {
  /** Data local "AAAA-MM-DD" */
  data: string;
  duracaoMin: number;
  intervaloMin: number;
  /** Faixas de expediente do dia da semana de `data`, das profissionais elegíveis. */
  faixas: Faixa[];
  /** Agendamentos ativos e bloqueios das profissionais. */
  ocupados: IntervaloProfissional[];
  /** Agendamentos ativos da própria cliente (com qualquer profissional). */
  ocupadosCliente?: Intervalo[];
  agora: Date;
  passoMin: number;
  antecedenciaMin: number;
};

export type Horario = {
  inicio: Date;
  /** Profissionais livres neste horário, da mais indicada para a menos indicada. */
  profissionais: string[];
};

const MIN = 60_000;

function sobrepoe(a: Intervalo, b: Intervalo) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export function calcularHorarios(e: EntradaDisponibilidade): Horario[] {
  const bloco = e.duracaoMin + e.intervaloMin;
  const limiteAntecedencia = e.agora.getTime() + e.antecedenciaMin * MIN;
  const ocupadosPorProf = agrupar(e.ocupados);
  const faixasPorProf = new Map<string, Faixa[]>();
  for (const f of e.faixas) faixasPorProf.set(f.profissionalId, [...(faixasPorProf.get(f.profissionalId) ?? []), f]);

  // chave = instante (ms) → candidatas com pontuação
  const porHorario = new Map<number, { profissionalId: string; pontos: number }[]>();

  for (const faixa of e.faixas) {
    const inicioFaixa = horaParaMinutos(faixa.inicio);
    const fimFaixa = horaParaMinutos(faixa.fim);
    const ocupadosDela = ocupadosPorProf.get(faixa.profissionalId) ?? [];

    for (let t = inicioFaixa; t + e.duracaoMin <= fimFaixa; t += e.passoMin) {
      const inicio = localParaUtc(e.data, minutosParaHora(t));
      if (inicio.getTime() < limiteAntecedencia) continue;
      const candidato = { inicio, fim: new Date(inicio.getTime() + bloco * MIN) };

      if (ocupadosDela.some((o) => sobrepoe(candidato, o))) continue;
      if (e.ocupadosCliente?.some((o) => sobrepoe(candidato, o))) continue;

      const pontos = pontuar(candidato, ocupadosDela, faixasPorProf.get(faixa.profissionalId) ?? [], e.data);
      const lista = porHorario.get(inicio.getTime()) ?? [];
      lista.push({ profissionalId: faixa.profissionalId, pontos });
      porHorario.set(inicio.getTime(), lista);
    }
  }

  const cargaDoDia = new Map<string, number>();
  for (const o of e.ocupados) cargaDoDia.set(o.profissionalId, (cargaDoDia.get(o.profissionalId) ?? 0) + 1);

  return [...porHorario.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ms, candidatas]) => ({
      inicio: new Date(ms),
      profissionais: candidatas
        .sort(
          (a, b) =>
            b.pontos - a.pontos ||
            (cargaDoDia.get(a.profissionalId) ?? 0) - (cargaDoDia.get(b.profissionalId) ?? 0),
        )
        .map((c) => c.profissionalId),
    }));
}

/**
 * Otimização da agenda: quando a cliente escolhe "qualquer profissional",
 * prefere quem fica com o horário "colado" a outro atendimento ou à borda
 * do expediente — assim sobram menos buracos ociosos na agenda.
 */
function pontuar(candidato: Intervalo, ocupados: Intervalo[], faixas: Faixa[], data: string) {
  const ini = candidato.inicio.getTime();
  const fim = candidato.fim.getTime();
  const bordasInicio = new Set<number>(ocupados.map((o) => o.fim.getTime()));
  const bordasFim = new Set<number>(ocupados.map((o) => o.inicio.getTime()));
  for (const f of faixas) {
    bordasInicio.add(localParaUtc(data, f.inicio.slice(0, 5)).getTime());
    bordasFim.add(localParaUtc(data, f.fim.slice(0, 5)).getTime());
  }
  return (bordasInicio.has(ini) ? 1 : 0) + (bordasFim.has(fim) ? 1 : 0);
}

function agrupar(lista: IntervaloProfissional[]) {
  const mapa = new Map<string, Intervalo[]>();
  for (const o of lista) mapa.set(o.profissionalId, [...(mapa.get(o.profissionalId) ?? []), o]);
  return mapa;
}
