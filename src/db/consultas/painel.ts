import "server-only";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { horariosTrabalho, profissionais, profissionalServicos, servicos, user } from "@/db/schema";

export async function listarServicos() {
  return db
    .select({
      id: servicos.id,
      nome: servicos.nome,
      duracaoMin: servicos.duracaoMin,
      intervaloMin: servicos.intervaloMin,
      precoCentavos: servicos.precoCentavos,
      ativo: servicos.ativo,
      qtdProfissionais: count(profissionalServicos.profissionalId),
    })
    .from(servicos)
    .leftJoin(profissionalServicos, eq(profissionalServicos.servicoId, servicos.id))
    .groupBy(servicos.id)
    .orderBy(desc(servicos.ativo), asc(servicos.nome));
}

export async function obterServico(id: string) {
  const [servico] = await db.select().from(servicos).where(eq(servicos.id, id));
  return servico ?? null;
}

export async function listarProfissionais() {
  return db
    .select({
      id: profissionais.id,
      nome: profissionais.nome,
      ativo: profissionais.ativo,
      emailLogin: user.email,
      // Atenção: em subselects DENTRO dos campos do select, o Drizzle não qualifica as
      // colunas com o nome da tabela — por isso os nomes são escritos explicitamente.
      qtdServicos: sql<number>`(select count(*) from profissional_servicos ps where ps.profissional_id = "profissionais"."id")::int`,
      qtdFaixas: sql<number>`(select count(*) from horarios_trabalho ht where ht.profissional_id = "profissionais"."id")::int`,
    })
    .from(profissionais)
    .leftJoin(user, eq(user.id, profissionais.usuarioId))
    .orderBy(desc(profissionais.ativo), asc(profissionais.nome));
}

export async function obterProfissional(id: string) {
  const [profissional] = await db
    .select({
      id: profissionais.id,
      nome: profissionais.nome,
      bio: profissionais.bio,
      ativo: profissionais.ativo,
      usuarioId: profissionais.usuarioId,
      emailLogin: user.email,
      nomeLogin: user.name,
    })
    .from(profissionais)
    .leftJoin(user, eq(user.id, profissionais.usuarioId))
    .where(eq(profissionais.id, id));
  if (!profissional) return null;

  const [vinculados, faixas, todosServicos] = await Promise.all([
    db
      .select({ servicoId: profissionalServicos.servicoId })
      .from(profissionalServicos)
      .where(eq(profissionalServicos.profissionalId, id)),
    db
      .select()
      .from(horariosTrabalho)
      .where(eq(horariosTrabalho.profissionalId, id))
      .orderBy(asc(horariosTrabalho.diaSemana), asc(horariosTrabalho.inicio)),
    db
      .select({ id: servicos.id, nome: servicos.nome, ativo: servicos.ativo })
      .from(servicos)
      .orderBy(desc(servicos.ativo), asc(servicos.nome)),
  ]);

  return {
    ...profissional,
    servicoIds: new Set(vinculados.map((v) => v.servicoId)),
    faixas,
    todosServicos,
  };
}

export async function resumoPainel() {
  const [[s], [p], semExpediente, semServicos] = await Promise.all([
    db.select({ total: count() }).from(servicos).where(eq(servicos.ativo, true)),
    db.select({ total: count() }).from(profissionais).where(eq(profissionais.ativo, true)),
    db
      .select({ id: profissionais.id, nome: profissionais.nome })
      .from(profissionais)
      .where(
        sql`${profissionais.ativo} and not exists (select 1 from ${horariosTrabalho} where ${horariosTrabalho.profissionalId} = ${profissionais.id})`,
      ),
    db
      .select({ id: profissionais.id, nome: profissionais.nome })
      .from(profissionais)
      .where(
        sql`${profissionais.ativo} and not exists (select 1 from ${profissionalServicos} where ${profissionalServicos.profissionalId} = ${profissionais.id})`,
      ),
  ]);
  return { servicosAtivos: s.total, profissionaisAtivas: p.total, semExpediente, semServicos };
}
