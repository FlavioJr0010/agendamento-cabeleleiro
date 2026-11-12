import { describe, expect, it } from "vitest";
import { calcularHorarios, type EntradaDisponibilidade } from "./disponibilidade";
import { horaLocal, localParaUtc } from "./fuso";

const DIA = "2026-11-17"; // terça
const ANA = "ana";
const BIA = "bia";
const t = (hora: string) => localParaUtc(DIA, hora);

function base(extra: Partial<EntradaDisponibilidade> = {}): EntradaDisponibilidade {
  return {
    data: DIA,
    duracaoMin: 60,
    intervaloMin: 0,
    faixas: [{ profissionalId: ANA, inicio: "09:00:00", fim: "12:00:00" }],
    ocupados: [],
    ocupadosCliente: [],
    agora: new Date("2026-11-10T12:00:00Z"),
    passoMin: 30,
    antecedenciaMin: 60,
    ...extra,
  };
}

const horas = (e: EntradaDisponibilidade) => calcularHorarios(e).map((h) => horaLocal(h.inicio));

describe("calcularHorarios", () => {
  it("oferece horários dentro do expediente, respeitando a duração", () => {
    // 09–12 com serviço de 60 min em passos de 30: o último início é 11:00
    expect(horas(base())).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("o intervalo de preparação ocupa a agenda, mas não precisa caber no expediente", () => {
    const e = base({
      intervaloMin: 15,
      ocupados: [{ profissionalId: ANA, inicio: t("10:30"), fim: t("11:00") }],
    });
    // bloco = 75 min: 09:00–10:15 ok; 09:30–10:45 bate em 10:30 ✗; 11:00 ok (termina 12:15)
    expect(horas(e)).toEqual(["09:00", "11:00"]);
  });

  it("não sobrepõe agendamentos nem bloqueios da profissional", () => {
    const e = base({ ocupados: [{ profissionalId: ANA, inicio: t("10:00"), fim: t("11:00") }] });
    expect(horas(e)).toEqual(["09:00", "11:00"]);
  });

  it("não sobrepõe outros agendamentos da própria cliente", () => {
    const e = base({ ocupadosCliente: [{ inicio: t("09:30"), fim: t("10:00") }] });
    expect(horas(e)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("respeita a antecedência mínima", () => {
    const e = base({ agora: t("08:45"), antecedenciaMin: 60 }); // só a partir de 09:45
    expect(horas(e)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("dia sem expediente não tem horários", () => {
    expect(horas(base({ faixas: [] }))).toEqual([]);
  });

  it("considera pausas (duas faixas no mesmo dia)", () => {
    const e = base({
      faixas: [
        { profissionalId: ANA, inicio: "09:00", fim: "10:00" },
        { profissionalId: ANA, inicio: "13:00", fim: "14:30" },
      ],
    });
    expect(horas(e)).toEqual(["09:00", "13:00", "13:30"]);
  });

  it("junta profissionais no mesmo horário", () => {
    const e = base({
      faixas: [
        { profissionalId: ANA, inicio: "09:00", fim: "10:00" },
        { profissionalId: BIA, inicio: "09:00", fim: "11:00" },
      ],
    });
    const r = calcularHorarios(e);
    expect(r.map((h) => [horaLocal(h.inicio), h.profissionais.sort()])).toEqual([
      ["09:00", [ANA, BIA]],
      ["09:30", [BIA]],
      ["10:00", [BIA]],
    ]);
  });

  it("em 'qualquer profissional', prefere quem não deixa buraco na agenda", () => {
    // Ana tem atendimento 09–10; Bia está livre. Às 10:00, Ana fica "colada" ao atendimento anterior.
    const e = base({
      faixas: [
        { profissionalId: ANA, inicio: "09:00", fim: "12:00" },
        { profissionalId: BIA, inicio: "08:00", fim: "12:00" },
      ],
      ocupados: [{ profissionalId: ANA, inicio: t("09:00"), fim: t("10:00") }],
    });
    const as10 = calcularHorarios(e).find((h) => horaLocal(h.inicio) === "10:00");
    expect(as10?.profissionais).toEqual([ANA, BIA]);
  });

  it("em empate, prefere quem tem menos atendimentos no dia", () => {
    const e = base({
      faixas: [
        { profissionalId: ANA, inicio: "09:00", fim: "12:00" },
        { profissionalId: BIA, inicio: "09:00", fim: "12:00" },
      ],
      ocupados: [{ profissionalId: ANA, inicio: t("11:00"), fim: t("12:00") }],
    });
    // 09:00 cola no início do expediente das duas (empate) → Bia tem menos atendimentos
    const as9 = calcularHorarios(e).find((h) => horaLocal(h.inicio) === "09:00");
    expect(as9?.profissionais).toEqual([BIA, ANA]);
  });
});
