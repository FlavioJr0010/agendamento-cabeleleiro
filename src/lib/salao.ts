import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracoesSalao, horariosTrabalho, profissionais, servicos } from "@/db/schema";
import { DIAS_SEMANA, formatarHora } from "./formato";

export const TAG_CONFIG = "configuracoes-salao";
export const TAG_CATALOGO = "catalogo";

export type ConfiguracoesSalao = typeof configuracoesSalao.$inferSelect;

const PADRAO: ConfiguracoesSalao = {
  id: 1,
  nome: "Studio Aurora",
  slogan: "Beleza com hora marcada",
  sobre: null,
  endereco: null,
  cidade: null,
  telefone: null,
  whatsapp: null,
  instagram: null,
  email: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

/** Identidade e contatos do salão (cache invalidado quando a dona salva). */
export async function obterConfiguracoes(): Promise<ConfiguracoesSalao> {
  "use cache";
  cacheTag(TAG_CONFIG);
  cacheLife("hours");
  const [c] = await db.select().from(configuracoesSalao).where(eq(configuracoesSalao.id, 1));
  return c ?? PADRAO;
}

/** Horário de funcionamento por dia: do primeiro início ao último fim entre as profissionais ativas. */
export async function obterHorarioFuncionamento() {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("hours");
  const linhas = await db
    .select({
      dia: horariosTrabalho.diaSemana,
      abre: sql<string>`min(${horariosTrabalho.inicio})::text`,
      fecha: sql<string>`max(${horariosTrabalho.fim})::text`,
    })
    .from(horariosTrabalho)
    .innerJoin(profissionais, eq(profissionais.id, horariosTrabalho.profissionalId))
    .where(eq(profissionais.ativo, true))
    .groupBy(horariosTrabalho.diaSemana);
  const porDia = new Map(linhas.map((l) => [Number(l.dia), l]));
  // Segunda a domingo (ordem habitual no Brasil).
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const l = porDia.get(d);
    return {
      dia: DIAS_SEMANA[d].nome,
      horario: l ? `${formatarHora(l.abre)} – ${formatarHora(l.fecha)}` : null,
    };
  });
}

/** Serviços em destaque na página inicial (ou os primeiros, se nenhum foi marcado). */
export async function obterServicosDestaque(limite = 6) {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("hours");
  const marcados = await db
    .select()
    .from(servicos)
    .where(sql`${servicos.ativo} and ${isNotNull(servicos.destaque)}`)
    .orderBy(asc(servicos.destaque))
    .limit(limite);
  if (marcados.length > 0) return marcados;
  return db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.precoCentavos)).limit(limite);
}

/** Link de WhatsApp a partir do número cadastrado. */
export function linkWhatsapp(numero: string | null | undefined, mensagem?: string) {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

export function linkInstagram(usuario: string | null | undefined) {
  const u = (usuario ?? "").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return u ? { url: `https://instagram.com/${u}`, usuario: `@${u}` } : null;
}

export function linkMapa(endereco: string | null | undefined, cidade?: string | null) {
  const q = [endereco, cidade].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
