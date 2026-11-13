import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { listaEspera, notificacoes, servicos, user } from "@/db/schema";
import { buscarDisponibilidade } from "@/db/consultas/agenda";
import { formatarDiaLongo, horaLocal } from "./fuso";

/**
 * Quando um horário é liberado (cancelamento, remarcação, bloqueio removido),
 * avisa quem está na lista de espera daquele dia se agora houver vaga compatível.
 */
export async function avisarListaEspera(
  servicoId: string | null,
  data: string,
) {
  const pendentes = await db
    .select({
      id: listaEspera.id,
      clienteId: listaEspera.clienteId,
      servicoId: listaEspera.servicoId,
      profissionalId: listaEspera.profissionalId,
      periodo: listaEspera.periodo,
      clienteNome: user.name,
      servico: servicos.nome,
    })
    .from(listaEspera)
    .innerJoin(user, eq(user.id, listaEspera.clienteId))
    .innerJoin(servicos, eq(servicos.id, listaEspera.servicoId))
    .where(
      and(
        eq(listaEspera.data, data),
        isNull(listaEspera.avisadoEm),
        servicoId ? eq(listaEspera.servicoId, servicoId) : undefined,
      ),
    );

  for (const p of pendentes) {
    const disp = await buscarDisponibilidade({
      servicoId: p.servicoId,
      profissionalId: p.profissionalId,
      data,
      clienteId: p.clienteId,
    });
    const livres = (disp?.horarios ?? []).filter((h) => {
      const hora = horaLocal(h.inicio);
      return (
        p.periodo === "qualquer" ||
        (p.periodo === "manha" ? hora < "12:00" : hora >= "12:00")
      );
    });
    if (livres.length === 0) continue;

    await db.transaction(async (tx) => {
      const atualizados = await tx
        .update(listaEspera)
        .set({ avisadoEm: new Date() })
        .where(and(eq(listaEspera.id, p.id), isNull(listaEspera.avisadoEm)))
        .returning({ id: listaEspera.id });
      if (!atualizados.length) return;
      await tx.insert(notificacoes).values({
        usuarioId: p.clienteId,
        tipo: "vaga_lista_espera",
        canal: "email",
        assunto: `Abriu vaga para ${p.servico}!`,
        corpo:
          `Olá, ${p.clienteNome.split(" ")[0]}! Abriu horário para ${p.servico} em ${formatarDiaLongo(data)}` +
          ` (a partir das ${horaLocal(livres[0].inicio)}). Corra para agendar pelo site antes que alguém pegue!`,
      });
    });
  }
}
