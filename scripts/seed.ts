/**
 * Popula o banco de desenvolvimento.  Uso: npm run db:seed
 * Idempotente: pode rodar várias vezes sem duplicar dados.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { auth } from "../src/lib/auth";

const { user, servicos, profissionais, profissionalServicos, horariosTrabalho } = schema;

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
  { nome: "Corte feminino", duracaoMin: 60, intervaloMin: 10, precoCentavos: 8000 },
  { nome: "Escova", duracaoMin: 45, intervaloMin: 5, precoCentavos: 5000 },
  { nome: "Coloração", duracaoMin: 120, intervaloMin: 15, precoCentavos: 18000 },
  { nome: "Hidratação", duracaoMin: 45, intervaloMin: 5, precoCentavos: 6000 },
  { nome: "Manicure", duracaoMin: 40, intervaloMin: 5, precoCentavos: 3500 },
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
      { nome: "Ana", bio: "Especialista em corte e coloração." },
      { nome: "Bia", bio: "Escova, hidratação e manicure." },
    ])
    .returning();

  await db.insert(profissionalServicos).values([
    { profissionalId: ana.id, servicoId: porNome["Corte feminino"] },
    { profissionalId: ana.id, servicoId: porNome["Coloração"] },
    { profissionalId: ana.id, servicoId: porNome["Escova"] },
    { profissionalId: bia.id, servicoId: porNome["Escova"] },
    { profissionalId: bia.id, servicoId: porNome["Hidratação"] },
    { profissionalId: bia.id, servicoId: porNome["Manicure"] },
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

async function main() {
  await criarDona();
  await criarCatalogo();
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
