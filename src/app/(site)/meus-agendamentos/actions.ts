"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos } from "@/db/schema";
import { executarAcao, falha, sucesso } from "@/lib/acao";
import { REGRAS } from "@/lib/regras";
import { autorizarAcao } from "@/lib/sessao";
import { registrarMensagemSistema } from "@/db/consultas/mensagens";
import { avisarListaEspera } from "@/lib/lista-espera";
import { dataLocal, formatarDataHora } from "@/lib/fuso";
import { cancelarLembretes } from "@/lib/notificacoes";

export async function cancelarAgendamento(id: string) {
  return executarAcao(async () => {
    const { user } = await autorizarAcao(["cliente", "profissional", "dona"]);

    const [ag] = await db
      .select({ inicio: agendamentos.inicio, status: agendamentos.status, servicoId: agendamentos.servicoId })
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
      .set({ status: "cancelado", canceladoPor: user.id, motivoCancelamento: "Cancelado pela cliente pelo site" })
      .where(and(eq(agendamentos.id, id), inArray(agendamentos.status, ["pendente", "confirmado"])));
    await cancelarLembretes(id);
    await registrarMensagemSistema(id, `A cliente cancelou o agendamento de ${formatarDataHora(ag.inicio)} pelo site.`, "Cancelamento");
    await avisarListaEspera(ag.servicoId, dataLocal(ag.inicio));
    return sucesso("Agendamento cancelado. O horário foi liberado.");
  });
}
