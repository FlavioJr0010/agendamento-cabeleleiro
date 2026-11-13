import "server-only";
import { connection } from "next/server";
import { and, eq, gte, lt, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  agendamentos,
  servicos,
  profissionais,
  user,
  lancamentos,
} from "@/db/schema";
import { hojeNoSalao, localParaUtc, somarDias } from "@/lib/fuso";
export async function dadosGestao(inicio?: string, fim?: string) {
  await connection();
  inicio ??= hojeNoSalao();
  fim ??= inicio;
  const [agenda, caixa] = await Promise.all([
    db
      .select({
        id: agendamentos.id,
        inicio: agendamentos.inicio,
        status: agendamentos.status,
        precoCentavos: agendamentos.precoCentavos,
        cliente: user.name,
        servico: servicos.nome,
        profissional: profissionais.nome,
      })
      .from(agendamentos)
      .innerJoin(user, eq(user.id, agendamentos.clienteId))
      .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
      .innerJoin(
        profissionais,
        eq(profissionais.id, agendamentos.profissionalId),
      )
      .where(
        and(
          gte(agendamentos.inicio, localParaUtc(inicio, "00:00")),
          lt(agendamentos.inicio, localParaUtc(somarDias(fim, 1), "00:00")),
        ),
      )
      .orderBy(asc(agendamentos.inicio)),
    db
      .select()
      .from(lancamentos)
      .where(
        and(
          gte(lancamentos.data, inicio),
          lt(lancamentos.data, somarDias(fim, 1)),
        ),
      )
      .orderBy(desc(lancamentos.createdAt)),
  ]);
  const entradas = caixa
    .filter((l) => l.tipo === "entrada")
    .reduce((s, l) => s + l.valorCentavos, 0);
  const saidas = caixa
    .filter((l) => l.tipo === "saida")
    .reduce((s, l) => s + l.valorCentavos, 0);
  const comissoes = caixa.reduce((s, l) => s + l.comissaoCentavos, 0);
  return {
    agenda,
    caixa,
    entradas,
    saidas,
    comissoes,
    saldo: entradas - saidas,
  };
}
