/**
 * Popula o banco de desenvolvimento.  Uso: npm run db:seed
 * Idempotente: pode rodar várias vezes sem duplicar dados.
 */
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { auth } from "../src/lib/auth";

const { user, servicos, profissionais, profissionalServicos, horariosTrabalho, configuracoesSalao } = schema;

async function criarDona() {
  const nome = process.env.SEED_DONA_NOME ?? "Dona do Salão";
  const email = (process.env.SEED_DONA_EMAIL ?? "dona@salao.local").toLowerCase();
  const senha = process.env.SEED_DONA_SENHA ?? "trocar123";

  let [dona] = await db.select().from(user).where(eq(user.email, email));
  if (!dona) {
    await auth.api.signUpEmail({ body: { name: nome, email, password: senha } });
    [dona] = await db.select().from(user).where(eq(user.email, email));
    console.log(`✓ Conta da dona criada: ${email} / ${senha}`);
  } else {
    console.log(`• Conta da dona já existe: ${email}`);
  }
  // Papel "dona" só pode ser atribuído aqui ou pelo painel, nunca pelo cadastro público.
  await db.update(user).set({ papel: "dona" }).where(eq(user.id, dona.id));
}

const SERVICOS = [
  { nome: "Corte feminino", duracaoMin: 60, intervaloMin: 10, precoCentavos: 8000, imagem: "servico-corte.webp", destaque: 1,
    descricao: "Corte personalizado com lavagem e finalização." },
  { nome: "Escova", duracaoMin: 45, intervaloMin: 5, precoCentavos: 5000, imagem: "servico-escova.webp", destaque: 2,
    descricao: "Escova modelada com proteção térmica." },
  { nome: "Coloração", duracaoMin: 120, intervaloMin: 15, precoCentavos: 18000, imagem: "servico-coloracao.webp", destaque: 3,
    descricao: "Cor global com produtos profissionais e diagnóstico do fio." },
  { nome: "Hidratação", duracaoMin: 45, intervaloMin: 5, precoCentavos: 6000, imagem: "servico-tratamento.webp", destaque: 4,
    descricao: "Tratamento intensivo para brilho e maciez." },
  { nome: "Manicure", duracaoMin: 40, intervaloMin: 5, precoCentavos: 3500, imagem: "servico-manicure.webp", destaque: 5,
    descricao: "Cutilagem, esmaltação e acabamento." },
  { nome: "Maquiagem social", duracaoMin: 60, intervaloMin: 10, precoCentavos: 15000, imagem: "servico-maquiagem.webp", destaque: 6,
    descricao: "Make para eventos, com preparação de pele." },
];

async function criarCatalogo() {
  const existentes = await db.select({ id: servicos.id }).from(servicos).limit(1);
  if (existentes.length > 0) {
    console.log("• Catálogo já existe, pulando serviços e profissionais.");
    return;
  }

  const criados = await db.insert(servicos).values(SERVICOS).returning();
  const porNome = Object.fromEntries(criados.map((s) => [s.nome, s.id]));

  const [ana, bia] = await db
    .insert(profissionais)
    .values([
      { nome: "Ana", bio: "Cabeleireira há 12 anos, especialista em corte e coloração.", comissaoPercentual: 45 },
      { nome: "Bia", bio: "Escova, tratamentos capilares, unhas e maquiagem para eventos.", comissaoPercentual: 40 },
    ])
    .returning();

  await db.insert(profissionalServicos).values([
    { profissionalId: ana.id, servicoId: porNome["Corte feminino"] },
    { profissionalId: ana.id, servicoId: porNome["Coloração"] },
    { profissionalId: ana.id, servicoId: porNome["Escova"] },
    { profissionalId: bia.id, servicoId: porNome["Escova"] },
    { profissionalId: bia.id, servicoId: porNome["Hidratação"] },
    { profissionalId: bia.id, servicoId: porNome["Manicure"] },
    { profissionalId: bia.id, servicoId: porNome["Maquiagem social"] },
  ]);

  // Terça (2) a sábado (6), 9h–18h, com almoço 12h–13h.
  const expediente = [2, 3, 4, 5, 6].flatMap((diaSemana) =>
    [ana.id, bia.id].flatMap((profissionalId) => [
      { profissionalId, diaSemana, inicio: "09:00", fim: "12:00" },
      { profissionalId, diaSemana, inicio: "13:00", fim: "18:00" },
    ]),
  );
  await db.insert(horariosTrabalho).values(expediente);

  console.log(`✓ ${criados.length} serviços, 2 profissionais e ${expediente.length} faixas de expediente criados.`);
}

/** Dados de DEMONSTRAÇÃO do salão (fictícios) — a dona edita em Painel → Configurações. */
async function criarConfiguracoes() {
  const [c] = await db.select().from(configuracoesSalao).where(eq(configuracoesSalao.id, 1));
  if (c?.endereco) {
    console.log("• Configurações já preenchidas.");
    return;
  }
  await db
    .insert(configuracoesSalao)
    .values({
      id: 1,
      nome: "Studio Aurora",
      slogan: "Beleza com hora marcada",
      sobre:
        "Cortes, cor e cuidados para os seus cabelos e unhas, com hora marcada e atendimento sem pressa. Agende online em menos de um minuto.",
      endereco: "Rua Exemplo, 123 — Centro",
      cidade: "Salvador — BA",
      telefone: "(71) 3000-0000",
      whatsapp: "(71) 90000-0000",
      instagram: "@studioaurora.exemplo",
      email: "contato@exemplo.com",
    })
    .onConflictDoUpdate({
      target: configuracoesSalao.id,
      set: {
        sobre: sql`excluded.sobre`,
        endereco: sql`excluded.endereco`,
        cidade: sql`excluded.cidade`,
        telefone: sql`excluded.telefone`,
        whatsapp: sql`excluded.whatsapp`,
        instagram: sql`excluded.instagram`,
        email: sql`excluded.email`,
      },
    });
  // Bancos criados antes desta versão: completa imagem/destaque/descrição dos serviços de exemplo.
  for (const s of SERVICOS) {
    await db
      .update(servicos)
      .set({ imagem: s.imagem, destaque: s.destaque, descricao: s.descricao })
      .where(sql`${servicos.nome} = ${s.nome} and ${servicos.imagem} is null`);
  }
  console.log("✓ Configurações de demonstração do salão preenchidas.");
}

async function main() {
  await criarDona();
  await criarCatalogo();
  await criarConfiguracoes();
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
