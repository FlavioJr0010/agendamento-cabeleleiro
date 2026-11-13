"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import {
  configuracoesSalao,
  fichasClientes,
  produtos,
  movimentacoesEstoque,
  fichaTecnica,
  lancamentos,
  profissionais,
  user,
} from "@/db/schema";
import { executarAcao, sucesso, falha, type EstadoAcao } from "@/lib/acao";
import { autorizarAcao } from "@/lib/sessao";
import { TAG_CONFIG } from "@/lib/salao";

export async function salvarConfiguracoes(_: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const schema = z.object({
      nome: z.string().trim().min(2).max(100),
      slogan: z.string().trim().min(2).max(160),
      sobre: z.string().trim().max(3000),
      endereco: z.string().trim().max(300),
      cidade: z.string().trim().max(100),
      telefone: z.string().trim().max(30),
      whatsapp: z
        .string()
        .trim()
        .regex(/^[+()\d\s-]*$/, "WhatsApp inválido.")
        .max(30),
      instagram: z
        .string()
        .trim()
        .regex(
          /^(@?[a-zA-Z0-9._]+)?$/,
          "Informe apenas o usuário do Instagram.",
        ),
      email: z.union([z.email(), z.literal("")]),
    });
    const d = schema.safeParse(Object.fromEntries(f));
    if (!d.success) return falha(d.error.issues[0].message);
    const dados = Object.fromEntries(
      Object.entries(d.data).map(([k, v]) => [k, v || null]),
    ) as typeof d.data;
    await db
      .insert(configuracoesSalao)
      .values({ id: 1, ...dados })
      .onConflictDoUpdate({ target: configuracoesSalao.id, set: dados });
    updateTag(TAG_CONFIG);
    return sucesso("Dados do salão atualizados.");
  });
}
export async function salvarFicha(id: string, _: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao(["dona"]);
    const [cliente] = await db.select().from(user).where(eq(user.id, id));
    if (cliente?.papel !== "cliente") return falha("Cliente não encontrada.");
    const schema = z.object({
      preferencias: z.string().trim().max(3000),
      formulaColoracao: z.string().trim().max(3000),
      alergias: z.string().trim().max(3000),
      observacoes: z.string().trim().max(3000),
    });
    const d = schema.safeParse(Object.fromEntries(f));
    if (!d.success) return falha("Cada campo aceita até 3000 caracteres.");
    const dados = { ...d.data, atualizadoPor: u.id };
    await db
      .insert(fichasClientes)
      .values({ clienteId: id, ...dados })
      .onConflictDoUpdate({ target: fichasClientes.clienteId, set: dados });
    return sucesso("Ficha atualizada.");
  });
}
export async function criarProduto(_: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const d = z
      .object({
        nome: z.string().trim().min(2).max(150),
        marca: z.string().trim().max(100),
        tipo: z.enum(["uso_interno", "revenda", "ambos"]),
        unidade: z.enum(["ml", "g", "un"]),
        estoqueMinimo: z.coerce.number().min(0).max(1000000),
        custoUnitarioCentavos: z.coerce.number().min(0).max(100000000),
        validade: z.union([z.iso.date(), z.literal("")]),
      })
      .safeParse(Object.fromEntries(f));
    if (!d.success) return falha(d.error.issues[0].message);
    await db
      .insert(produtos)
      .values({ ...d.data, validade: d.data.validade || null });
    return sucesso("Produto cadastrado.");
  });
}
export async function movimentarEstoque(_: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao(["dona"]);
    const d = z
      .object({
        produtoId: z.uuid(),
        quantidade: z.coerce
          .number()
          .finite()
          .min(-1000000)
          .max(1000000)
          .refine((v) => v !== 0),
        observacao: z.string().trim().min(2).max(300),
      })
      .safeParse(Object.fromEntries(f));
    if (!d.success)
      return falha("Informe produto, quantidade diferente de zero e motivo.");
    // Com "sentido" informado, a quantidade é digitada sempre positiva.
    const sentido = f.get("sentido");
    if (sentido === "saida") d.data.quantidade = -Math.abs(d.data.quantidade);
    if (sentido === "entrada") d.data.quantidade = Math.abs(d.data.quantidade);
    await db
      .insert(movimentacoesEstoque)
      .values({
        ...d.data,
        tipo: d.data.quantidade > 0 ? "entrada" : "saida",
        criadoPor: u.id,
      });
    return sucesso("Movimentação registrada.");
  });
}
export async function salvarFichaTecnica(_: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const d = z
      .object({
        produtoId: z.uuid(),
        servicoId: z.uuid(),
        quantidade: z.coerce.number().positive().max(1000000),
      })
      .safeParse(Object.fromEntries(f));
    if (!d.success)
      return falha("Informe serviço, produto e consumo positivo.");
    await db
      .insert(fichaTecnica)
      .values(d.data)
      .onConflictDoUpdate({
        target: [fichaTecnica.servicoId, fichaTecnica.produtoId],
        set: { quantidade: d.data.quantidade },
      });
    return sucesso("Ficha técnica atualizada.");
  });
}
export async function removerItemFicha(servicoId: string, produtoId: string) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const { and } = await import("drizzle-orm");
    await db
      .delete(fichaTecnica)
      .where(
        and(
          eq(fichaTecnica.servicoId, servicoId),
          eq(fichaTecnica.produtoId, produtoId),
        ),
      );
    return sucesso("Item removido.");
  });
}
export async function registrarLancamento(_: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    const { user: u } = await autorizarAcao(["dona"]);
    const d = z
      .object({
        tipo: z.enum(["entrada", "saida"]),
        descricao: z.string().trim().min(2).max(300),
        valor: z
          .string()
          .regex(/^\d+(,\d{1,2})?$/, "Use valor como 150,00.")
          .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
          .pipe(z.number().int().positive().max(100000000)),
        data: z.iso.date(),
        formaPagamento: z.enum([
          "pix",
          "dinheiro",
          "credito",
          "debito",
          "outro",
        ]),
      })
      .safeParse(Object.fromEntries(f));
    if (!d.success) return falha(d.error.issues[0].message);
    const { valor, ...dados } = d.data;
    await db
      .insert(lancamentos)
      .values({
        ...dados,
        valorCentavos: valor,
        categoria: dados.tipo === "saida" ? "despesa" : "outro",
        criadoPor: u.id,
      });
    return sucesso("Lançamento registrado.");
  });
}
export async function salvarComissao(id: string, _: EstadoAcao, f: FormData) {
  return executarAcao(async () => {
    await autorizarAcao(["dona"]);
    const d = z.coerce.number().min(0).max(100).safeParse(f.get("comissao"));
    if (!d.success) return falha("Comissão deve ficar entre 0 e 100%.");
    await db
      .update(profissionais)
      .set({ comissaoPercentual: d.data })
      .where(eq(profissionais.id, id));
    return sucesso("Comissão atualizada para os próximos atendimentos.");
  });
}
