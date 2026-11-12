import { describe, expect, it } from "vitest";
import {
  dataLocal,
  dataValida,
  diaDaSemana,
  formatarDataHora,
  horaLocal,
  localParaUtc,
  somarDias,
} from "./fuso";

describe("fuso do salão (America/Sao_Paulo, UTC-3)", () => {
  it("converte horário local em UTC", () => {
    expect(localParaUtc("2026-11-17", "09:00").toISOString()).toBe("2026-11-17T12:00:00.000Z");
    expect(localParaUtc("2026-11-17", "22:30").toISOString()).toBe("2026-11-18T01:30:00.000Z");
  });

  it("converte UTC de volta para data e hora locais", () => {
    const instante = new Date("2026-11-18T01:30:00Z");
    expect(dataLocal(instante)).toBe("2026-11-17");
    expect(horaLocal(instante)).toBe("22:30");
  });

  it("calcula o dia da semana de uma data", () => {
    expect(diaDaSemana("2026-11-15")).toBe(0); // domingo
    expect(diaDaSemana("2026-11-17")).toBe(2); // terça
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("valida datas", () => {
    expect(dataValida("2026-11-17")).toBe(true);
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("17/11/2026")).toBe(false);
  });

  it("formata para exibição em português", () => {
    expect(formatarDataHora(new Date("2026-11-17T12:30:00Z"))).toBe("terça-feira, 17 de novembro, às 09:30");
  });
});
