"use server";

import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { horariosTrabalho, profissionais, profissionalServicos, servicos, user } from "@/db/schema";
import { erroValidacao, executarAcao, falha, sucesso, type EstadoAcao } from "@/lib/acao";
import { DIAS_SEMANA } from "@/lib/formato";
import { autorizarAcao } from "@/lib/sessao";

// ─── Dados básicos ───────────────────────────────────────────────────────────

const esquemaProfissional = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80, "Nome muito longo."),
  bio: z
    .string()
    .trim()
    .max(500, "Apresentação muito longa.")
    .transform((v) => v || null),
});

export async function criarProfissional(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let novaId: string | undefined;
  const resultado = await executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const dados = esquemaProfissional.safeParse({
      nome: formData.get("nome") ?? "",
      bio: formData.get("bio") ?? "",
    });
    if (!dados.success) return erroValidacao(dados.error);

    const [nova] = await db.insert(profissionais).values(dados.data).returning({ id: profissionais.id });
    novaId = nova.id;
    return sucesso();
  });
  // Após criar, leva direto para a página da profissional (serviços e expediente).
  // (redirect fica fora do executarAcao, que capturaria a exceção de navegação)
  if (resultado?.ok && novaId) redirect(`/painel/profissionais/${novaId}`);
  return resultado;
}

export async function atualizarProfissional(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const dados = esquemaProfissional.safeParse({
      nome: formData.get("nome") ?? "",
      bio: formData.get("bio") ?? "",
    });
    if (!dados.success) return erroValidacao(dados.error);

    const alteradas = await db
      .update(profissionais)
      .set(dados.data)
      .where(eq(profissionais.id, id))
      .returning({ id: profissionais.id });
    if (alteradas.length === 0) return falha("Profissional não encontrada.");
    return sucesso("Alterações salvas.");
  });
}

export async function alternarAtivoProfissional(id: string) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const [p] = await db
      .update(profissionais)
      .set({ ativo: sql`not ${profissionais.ativo}` })
      .where(eq(profissionais.id, id))
      .returning({ ativo: profissionais.ativo });
    if (!p) return falha("Profissional não encontrada.");
    return sucesso(p.ativo ? "Profissional reativada." : "Profissional desativada. Ela não aparece mais para agendamento.");
  });
}

// ─── Serviços que a profissional faz ─────────────────────────────────────────

export async function definirServicos(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const ids = z.array(z.uuid()).safeParse(formData.getAll("servicos"));
    if (!ids.success) return falha("Seleção de serviços inválida.");

    const [p] = await db.select({ id: profissionais.id }).from(profissionais).where(eq(profissionais.id, id));
    if (!p) return falha("Profissional não encontrada.");

    await db.transaction(async (tx) => {
      await tx.delete(profissionalServicos).where(eq(profissionalServicos.profissionalId, id));
      if (ids.data.length > 0) {
        // Garante que só ids de serviços existentes sejam vinculados.
        const existentes = await tx.select({ id: servicos.id }).from(servicos).where(inArray(servicos.id, ids.data));
        if (existentes.length > 0) {
          await tx.insert(profissionalServicos).values(existentes.map((s) => ({ profissionalId: id, servicoId: s.id })));
        }
      }
    });
    return sucesso("Serviços atualizados.");
  });
}

// ─── Expediente ──────────────────────────────────────────────────────────────

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const esquemaFaixa = z
  .object({
    dias: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Escolha pelo menos um dia da semana."),
    inicio: z.string().regex(HORA, "Horário de início inválido."),
    fim: z.string().regex(HORA, "Horário de fim inválido."),
  })
  .refine((f) => f.inicio < f.fim, { message: "O início precisa ser antes do fim." });

export async function adicionarFaixas(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const dados = esquemaFaixa.safeParse({
      dias: formData.getAll("dias"),
      inicio: formData.get("inicio"),
      fim: formData.get("fim"),
    });
    if (!dados.success) return erroValidacao(dados.error);
    const { dias, inicio, fim } = dados.data;

    // Não permite faixas sobrepostas no mesmo dia (ex.: 09–12 e 11–14).
    const conflitos = await db
      .select({ diaSemana: horariosTrabalho.diaSemana })
      .from(horariosTrabalho)
      .where(
        and(
          eq(horariosTrabalho.profissionalId, id),
          inArray(horariosTrabalho.diaSemana, dias),
          lt(horariosTrabalho.inicio, fim),
          gt(horariosTrabalho.fim, inicio),
        ),
      );
    if (conflitos.length > 0) {
      const nomes = [...new Set(conflitos.map((c) => DIAS_SEMANA[c.diaSemana].nome))].join(", ");
      return falha(`Esse horário se sobrepõe a uma faixa já cadastrada em: ${nomes}.`);
    }

    await db.insert(horariosTrabalho).values(dias.map((diaSemana) => ({ profissionalId: id, diaSemana, inicio, fim })));
    return sucesso(dias.length > 1 ? `Faixa adicionada em ${dias.length} dias.` : "Faixa adicionada.");
  });
}

export async function removerFaixa(profissionalId: string, faixaId: string) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    await db
      .delete(horariosTrabalho)
      .where(and(eq(horariosTrabalho.id, faixaId), eq(horariosTrabalho.profissionalId, profissionalId)));
    return sucesso();
  });
}

// ─── Acesso (login da profissional) ──────────────────────────────────────────

export async function vincularLogin(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const email = z.email("E-mail inválido.").safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
    if (!email.success) return erroValidacao(email.error);

    const [profissional] = await db.select({ id: profissionais.id }).from(profissionais).where(eq(profissionais.id, id));
    if (!profissional) return falha("Profissional não encontrada.");

    const [conta] = await db.select().from(user).where(eq(user.email, email.data));
    if (!conta) {
      return falha("Nenhuma conta com esse e-mail. Peça para a profissional se cadastrar no site primeiro.");
    }

    const [jaVinculada] = await db
      .select({ id: profissionais.id, nome: profissionais.nome })
      .from(profissionais)
      .where(eq(profissionais.usuarioId, conta.id));
    if (jaVinculada && jaVinculada.id !== id) {
      return falha(`Essa conta já está ligada à profissional "${jaVinculada.nome}".`);
    }

    await db.transaction(async (tx) => {
      await tx.update(profissionais).set({ usuarioId: conta.id }).where(eq(profissionais.id, id));
      // A dona pode também atender; nesse caso mantém o papel "dona".
      if (conta.papel === "cliente") {
        await tx.update(user).set({ papel: "profissional" }).where(eq(user.id, conta.id));
      }
    });
    return sucesso(`Acesso liberado para ${conta.email}.`);
  });
}

export async function desvincularLogin(id: string) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    await db.transaction(async (tx) => {
      const [p] = await tx
        .select({ usuarioId: profissionais.usuarioId })
        .from(profissionais)
        .where(eq(profissionais.id, id));
      if (!p?.usuarioId) return;

      await tx.update(profissionais).set({ usuarioId: null }).where(eq(profissionais.id, id));
      await tx
        .update(user)
        .set({ papel: "cliente" })
        .where(and(eq(user.id, p.usuarioId), eq(user.papel, "profissional")));
    });
    return sucesso("Acesso removido.");
  });
}
