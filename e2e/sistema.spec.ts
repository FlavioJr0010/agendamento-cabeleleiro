import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { hojeNoSalao, somarDias } from "../src/lib/fuso";
import { processarLembretes } from "../src/lib/processar-lembretes";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marcador = `E2E ${Date.now()}`;
const email = `e2e-${Date.now()}@example.com`;
async function entrar(p: Page) {
  await p.goto("/entrar");
  await p
    .getByLabel("E-mail", { exact: true })
    .fill(process.env.SEED_DONA_EMAIL ?? "dona@salao.local");
  await p
    .getByLabel("Senha", { exact: true })
    .fill(process.env.SEED_DONA_SENHA ?? "trocar123");
  await p.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(p).toHaveURL(/\/painel$/);
}

test("reserva, mensagens, gestão, estoque, caixa e fila de lembretes", async ({
  page,
  browser,
}) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  let clienteId: string | undefined,
    agId: string | undefined,
    produtoId: string | undefined;
  const original = (
    await pool.query("select * from configuracoes_salao where id=1")
  ).rows[0];
  const {
    rows: [servico],
  } = await pool.query(
    "select s.id,s.nome from servicos s join profissional_servicos ps on ps.servico_id=s.id join profissionais p on p.id=ps.profissional_id where s.ativo and p.ativo limit 1",
  );
  const diasTrabalho = (
    await pool.query(
      `select distinct ht.dia_semana from horarios_trabalho ht join profissional_servicos ps on ps.profissional_id=ht.profissional_id where ps.servico_id=$1`,
      [servico.id],
    )
  ).rows.map((r) => Number(r.dia_semana));
  let dataTeste = somarDias(hojeNoSalao(), 2);
  while (!diasTrabalho.includes(new Date(`${dataTeste}T12:00:00Z`).getUTCDay()))
    dataTeste = somarDias(dataTeste, 1);
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  admin.on("pageerror", (e) => erros.push(e.message));
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Menu", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/cadastro");
    await page.getByLabel("Nome", { exact: true }).fill(marcador);
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("TesteE2E123!");
    await page.getByLabel("Confirmar senha").fill("TesteE2E123!");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(page).toHaveURL(/\/conta$/);
    clienteId = (
      await pool.query('select id from "user" where email=$1', [email])
    ).rows[0].id;
    await page.goto("/painel/estoque");
    await expect(page).toHaveURL(/\/$/);
    await page.goto(
      `/agendar?servico=${servico.id}&profissional=qualquer&data=${dataTeste}`,
    );
    await page.getByRole("button", { name: "Avise-me se abrir vaga" }).click();
    await expect(page.getByRole("status")).toContainText("lista de espera");
    await page.getByRole("button", { name: "Avise-me se abrir vaga" }).click();
    await expect(page.getByRole("status")).toContainText("lista de espera");
    expect(
      (
        await pool.query(
          "select count(*)::int as n from lista_espera where cliente_id=$1",
          [clienteId],
        )
      ).rows[0].n,
    ).toBe(1);
    await page.locator('a[href*="horario="]').first().click();
    await page
      .getByRole("button", { name: "Confirmar agendamento", exact: true })
      .click();
    await expect(page).toHaveURL(/meus-agendamentos\?novo=1/);
    agId = (
      await pool.query("select id from agendamentos where cliente_id=$1", [
        clienteId,
      ])
    ).rows[0].id;
    await page.goto("/mensagens");
    await page.getByLabel("Assunto", { exact: true }).fill(marcador);
    await page
      .getByLabel("Mensagem", { exact: true })
      .fill("Teste de mensagem da cliente");
    await page
      .getByRole("button", { name: "Enviar mensagem", exact: true })
      .click();
    await expect(page).toHaveURL(/\/mensagens\/[\w-]+$/);
    await expect(
      page.getByText("Teste de mensagem da cliente", { exact: true }),
    ).toBeVisible();
    const threadId = page.url().split("/").pop();
    await entrar(admin);
    for (const rota of [
      "agenda",
      "mensagens",
      "clientes",
      "estoque",
      "financeiro",
      "indicadores",
      "configuracoes",
    ]) {
      const r = await admin.goto("/painel/" + rota);
      expect(r?.status()).toBe(200);
      await expect(admin.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await admin.getByLabel("Nome", { exact: true }).fill(marcador);
    await admin.getByRole("button", { name: "Salvar configurações" }).click();
    await expect(admin.getByRole("status")).toContainText("atualizados");
    await page.goto("/");
    await expect(
      page
        .getByRole("link", {
          name: `${marcador} — página inicial`,
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await admin.goto(`/painel/clientes/${clienteId}`);
    await admin
      .getByLabel("Preferências", { exact: true })
      .fill("Prefere atendimento pela manhã");
    await admin.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(admin.getByRole("status")).toContainText("Ficha atualizada");
    await admin.reload();
    await expect(admin.getByLabel("Preferências", { exact: true })).toHaveValue(
      "Prefere atendimento pela manhã",
    );
    await admin.goto(`/painel/mensagens/${threadId}`);
    await admin
      .getByLabel("Mensagem", { exact: true })
      .fill("Resposta da equipe E2E");
    await admin.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(
      admin.getByText("Resposta da equipe E2E", { exact: true }),
    ).toBeVisible();
    await page.goto(`/mensagens/${threadId}`);
    await expect(
      page.getByText("Resposta da equipe E2E", { exact: true }),
    ).toBeVisible();
    await admin.goto("/painel/estoque");
    const novo = admin.locator("form").filter({
      has: admin.getByRole("button", {
        name: "Cadastrar produto",
        exact: true,
      }),
    });
    await novo.getByLabel("Nome", { exact: true }).fill(marcador);
    await novo.getByLabel("Tipo", { exact: true }).selectOption("uso_interno");
    await novo.getByLabel("Unidade", { exact: true }).selectOption("ml");
    await novo
      .getByRole("button", { name: "Cadastrar produto", exact: true })
      .click();
    await expect(novo.getByRole("status")).toContainText("cadastrado");
    produtoId = (
      await pool.query("select id from produtos where nome=$1", [marcador])
    ).rows[0].id;
    const mov = admin.locator("form").filter({
      has: admin.getByRole("button", {
        name: "Registrar movimentação",
        exact: true,
      }),
    });
    await mov.getByLabel("Produto", { exact: true }).selectOption(produtoId!);
    await mov.getByLabel("Quantidade", { exact: true }).fill("100");
    await mov.getByLabel("Motivo", { exact: true }).fill(marcador);
    await mov.getByRole("button").click();
    await expect(mov.getByRole("status")).toContainText("registrada");
    const ficha = admin.locator("form").filter({
      has: admin.getByRole("button", { name: "Salvar consumo", exact: true }),
    });
    await ficha.getByLabel("Serviço", { exact: true }).selectOption(servico.id);
    await ficha.getByLabel("Produto", { exact: true }).selectOption(produtoId!);
    await ficha.getByLabel("Consumo por serviço", { exact: true }).fill("10");
    await ficha.getByRole("button").click();
    await expect(ficha.getByRole("status")).toContainText("atualizada");
    await admin.goto(`/painel/agenda/${agId}`);
    await admin.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(admin.getByText("Confirmado", { exact: true })).toBeVisible();
    expect(
      (
        await pool.query(
          "select count(*)::int as n from notificacoes where agendamento_id=$1",
          [agId],
        )
      ).rows[0].n,
    ).toBe(1);
    await admin.getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(admin.getByText("Concluído", { exact: true })).toBeVisible();
    expect(
      Number(
        (
          await pool.query(
            "select quantidade_atual from produtos where id=$1",
            [produtoId],
          )
        ).rows[0].quantidade_atual,
      ),
    ).toBe(90);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from lancamentos where agendamento_id=$1",
          [agId],
        )
      ).rows[0].n,
    ).toBe(1);
    await page.goto(
      `/agendar?servico=${servico.id}&profissional=qualquer&data=${dataTeste}`,
    );
    await page.locator('a[href*="horario="]').first().click();
    await page
      .getByRole("button", { name: "Confirmar agendamento", exact: true })
      .click();
    await expect(page).toHaveURL(/meus-agendamentos\?novo=1/);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Cancelado", {exact:true})).toBeVisible();
    expect(
      (
        await pool.query(
          "select avisado_em from lista_espera where cliente_id=$1",
          [clienteId],
        )
      ).rows[0].avisado_em,
    ).not.toBeNull();
    expect(
      (
        await pool.query(
          "select count(*)::int as n from notificacoes where usuario_id=$1 and tipo='vaga_lista_espera'",
          [clienteId],
        )
      ).rows[0].n,
    ).toBe(1);
    const pagamento = (
      await pool.query(
        "select l.valor_centavos,l.comissao_centavos,p.comissao_percentual from lancamentos l join profissionais p on p.id=l.profissional_id where l.agendamento_id=$1",
        [agId],
      )
    ).rows[0];
    expect(pagamento.comissao_centavos).toBe(
      Math.round(
        (pagamento.valor_centavos * Number(pagamento.comissao_percentual)) /
          100,
      ),
    );
    await admin.goto("/painel/financeiro");
    const caixa = admin.locator("form").filter({
      has: admin.getByRole("button", {
        name: "Registrar lançamento",
        exact: true,
      }),
    });
    await caixa.getByLabel("Tipo", { exact: true }).selectOption("saida");
    await caixa.getByLabel("Descrição", { exact: true }).fill(marcador);
    await caixa.getByLabel("Valor (R$)", { exact: true }).fill("12,50");
    await caixa
      .getByLabel("Forma de pagamento", { exact: true })
      .selectOption("pix");
    await caixa.getByRole("button").click();
    await expect(caixa.getByRole("status")).toContainText("registrado");
    await admin.goto("/painel/indicadores");
    await expect(
      admin.getByText("Atendimentos concluídos", { exact: true }),
    ).toBeVisible();
    const notification = (
      await pool.query(
        `insert into notificacoes(usuario_id,tipo,assunto,corpo) values($1,'teste_e2e',$2,'teste') returning id`,
        [clienteId, marcador],
      )
    ).rows[0].id;
    // Processa apenas a fila isolada desta execução: sem e-mails reais.
    const testPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const conn = await pool.connect();
    await conn.query("begin");
    await conn.query("select id from notificacoes where id<>$1 for update", [
      notification,
    ]);
    let vistos = 0;
    try {
      const simulado = await processarLembretes(
        testPool,
        async () => {
          throw new Error("Simulação não deve enviar");
        },
        true,
      );
      expect(simulado.enviados).toBe(0);
      const falhou = await processarLembretes(testPool, async () => {
        throw new Error("Falha temporária simulada");
      });
      expect(falhou.erros).toBe(1);
      const [pendente] = (
        await pool.query(
          "select erro,enviado_em from notificacoes where id=$1",
          [notification],
        )
      ).rows;
      expect(pendente.enviado_em).toBeNull();
      expect(pendente.erro).toContain("Falha temporária");
      const r = await processarLembretes(testPool, async (n) => {
        expect(n.id).toBe(notification);
        vistos++;
      });
      expect(r.enviados).toBe(1);
      expect(vistos).toBe(1);
      const repetido = await processarLembretes(testPool, async () => {
        throw new Error("Notificação já enviada");
      });
      expect(repetido.enviados).toBe(0);
      expect(repetido.erros).toBe(0);
    } finally {
      await conn.query("rollback");
      conn.release();
      await testPool.end();
    }
    expect(
      (
        await pool.query("select enviado_em from notificacoes where id=$1", [
          notification,
        ])
      ).rows[0].enviado_em,
    ).not.toBeNull();
    expect(erros).toEqual([]);
  } finally {
    if (original) {
      const campos = [
        "nome",
        "slogan",
        "sobre",
        "endereco",
        "cidade",
        "telefone",
        "whatsapp",
        "instagram",
        "email",
      ];
      await pool.query(
        `update configuracoes_salao set ${campos.map((c, i) => `${c}=$${i + 1}`).join(",")} where id=1`,
        campos.map((c) => original[c]),
      );
    }
    if (clienteId) {
      const ids = (
        await pool.query("select id from agendamentos where cliente_id=$1", [
          clienteId,
        ])
      ).rows.map((r) => r.id);
      await pool.query(
        "delete from lancamentos where agendamento_id=any($1::uuid[])",
        [ids],
      );
      await pool.query(
        "delete from movimentacoes_estoque where agendamento_id=any($1::uuid[])",
        [ids],
      );
      await pool.query("delete from agendamentos where cliente_id=$1", [
        clienteId,
      ]);
    }
    await pool.query("delete from lancamentos where descricao=$1", [marcador]);
    if (produtoId)
      await pool.query("delete from produtos where id=$1", [produtoId]);
    if (clienteId)
      await pool.query('delete from "user" where id=$1', [clienteId]);
    if (original && !admin.isClosed()) {
      await admin.goto("/painel/configuracoes", { timeout: 10000 });
      await admin.getByLabel("Nome", { exact: true }).fill(original.nome);
      await admin.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(admin.getByRole("status")).toContainText("atualizados");
    }
    await ctx.close();
    await pool.end();
  }
});
