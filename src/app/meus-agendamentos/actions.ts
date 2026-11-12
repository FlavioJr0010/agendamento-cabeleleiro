"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos } from "@/db/schema";
import { executarAcao, falha, sucesso } from "@/lib/acao";
import { REGRAS } from "@/lib/regras";
import { autorizarAcao } from "@/lib/sessao";

export async function cancelarAgendamento(id: string) {
  return executarAcao(async () => {
    const { user } = await autorizarAcao(["cliente", "profissional", "dona"]);

    const [ag] = await db
      .select({ inicio: agendamentos.inicio, status: agendamentos.status })
      .from(agendamentos)
      // Só a dona do agendamento pode cancelar por aqui.
      .where(and(eq(agendamentos.id, id), eq(agendamentos.clienteId, user.id)));
    if (!ag) return falha("Agendamento não encontrado.");
    if (ag.status !== "pendente" && ag.status !== "confirmado") {
      return falha("Este agendamento não pode mais ser cancelado.");
    }

    const limite = ag.inicio.getTime() - REGRAS.prazoCancelamentoHoras * 3_600_000;
    if (Date.now() > limite) {
      return falha(
        `Cancelamentos pelo site só até ${REGRAS.prazoCancelamentoHoras}h antes. Fale com o salão para cancelar.`,
      );
    }

    await db
      .update(agendamentos)
      .set({ status: "cancelado" })
      .where(and(eq(agendamentos.id, id), inArray(agendamentos.status, ["pendente", "confirmado"])));
    return sucesso("Agendamento cancelado. O horário foi liberado.");
  });
}
