"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { servicos } from "@/db/schema";
import { erroValidacao, executarAcao, falha, sucesso, type EstadoAcao } from "@/lib/acao";
import { precoParaCentavos } from "@/lib/formato";
import { autorizarAcao } from "@/lib/sessao";

const esquemaServico = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço.").max(80, "Nome muito longo."),
  descricao: z
    .string()
    .trim()
    .max(500, "Descrição muito longa.")
    .transform((v) => v || null),
  duracaoMin: z.coerce
    .number({ message: "Informe a duração em minutos." })
    .int("A duração deve ser em minutos inteiros.")
    .min(5, "A duração mínima é 5 minutos.")
    .max(600, "A duração máxima é 10 horas."),
  intervaloMin: z.coerce
    .number({ message: "Informe o intervalo em minutos." })
    .int("O intervalo deve ser em minutos inteiros.")
    .min(0, "O intervalo não pode ser negativo.")
    .max(120, "O intervalo máximo é 2 horas."),
  precoCentavos: z
    .string()
    .transform((v) => precoParaCentavos(v))
    .refine((v): v is number => v !== null, "Preço inválido. Use o formato 80,00."),
});

function lerServico(formData: FormData) {
  return esquemaServico.safeParse({
    nome: formData.get("nome") ?? "",
    descricao: formData.get("descricao") ?? "",
    duracaoMin: formData.get("duracaoMin"),
    intervaloMin: formData.get("intervaloMin") || 0,
    precoCentavos: formData.get("preco") ?? "",
  });
}

export async function criarServico(_: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const dados = lerServico(formData);
    if (!dados.success) return erroValidacao(dados.error);

    await db.insert(servicos).values(dados.data);
    return sucesso(`Serviço "${dados.data.nome}" cadastrado.`);
  });
}

export async function atualizarServico(id: string, _: EstadoAcao, formData: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const dados = lerServico(formData);
    if (!dados.success) return erroValidacao(dados.error);

    const alterados = await db.update(servicos).set(dados.data).where(eq(servicos.id, id)).returning({ id: servicos.id });
    if (alterados.length === 0) return falha("Serviço não encontrado.");
    return sucesso("Alterações salvas.");
  });
}

export async function alternarAtivoServico(id: string) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const [s] = await db
      .update(servicos)
      .set({ ativo: sql`not ${servicos.ativo}` })
      .where(eq(servicos.id, id))
      .returning({ ativo: servicos.ativo });
    if (!s) return falha("Serviço não encontrado.");
    return sucesso(s.ativo ? "Serviço reativado." : "Serviço desativado. Ele não aparece mais para as clientes.");
  });
}

