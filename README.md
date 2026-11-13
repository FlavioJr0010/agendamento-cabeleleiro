# agendamento-cabeleleiro

Sistema web para salão de beleza: agendamento online, conversa entre cliente e salão (threads) e área administrativa (agenda, estoque, financeiro e indicadores).

Pesquisa de referências e escopo: [`docs/pesquisa-referencias.md`](docs/pesquisa-referencias.md)

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) + React |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco de dados | PostgreSQL 17 em Docker (porta **55432** no host) |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Autenticação | Better Auth (e-mail + senha; sem confirmação de e-mail na fase 1) |

## Como rodar

Pré-requisitos: Node.js 20+ e Docker.

```bash
# 1. Variáveis de ambiente (depois troque BETTER_AUTH_SECRET: openssl rand -base64 32)
cp .env.example .env

# 2. Subir o banco (PostgreSQL em localhost:55432)
npm run db:up

# 3. Dependências, tabelas e dados de exemplo
npm install
npm run db:migrate
npm run db:seed        # cria a conta da dona + serviços e profissionais de exemplo

# 4. Rodar o app (http://localhost:3000)
npm run dev
```

Conta da dona criada pelo seed (definida no `.env`): `dona@salao.local` / `trocar123`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run typecheck` | ESLint / checagem de tipos |
| `npm test` | Testes unitários (Vitest) |
| `npm run db:up` / `db:down` | Sobe / para o PostgreSQL no Docker |
| `npm run db:generate` | Gera migration a partir de mudanças em `src/db/schema/` |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:studio` | Abre o Drizzle Studio (navegar pelos dados) |
| `npm run db:seed` | Dados iniciais (idempotente) |

## Estrutura

```text
src/
  app/
    (auth)/entrar, (auth)/cadastro   login e cadastro (aceitam ?voltar=/caminho)
    servicos/                        página pública: serviços, preços e equipe
    agendar/                         fluxo de agendamento em 4 etapas + actions.ts
    meus-agendamentos/               próximos horários, histórico e cancelamento
    conta/                           minha conta
    painel/                          painel da dona (só papel "dona")
      servicos/                      cadastro/edição de serviços + actions.ts
      profissionais/                 equipe, serviços, expediente, acesso + actions.ts
    api/auth/[...all]/               rotas do Better Auth
  components/
    ui.tsx                           Campo, Botao, Secao, Selo, Esqueleto…
    form-acao.tsx                    <FormAcao>: formulário ligado a Server Action
  db/
    schema/auth.ts                   tabelas do Better Auth (+ papel e telefone)
    schema/salao.ts                  serviços, profissionais, agenda, threads
    consultas/                       consultas de leitura por área
  lib/
    auth.ts / auth-client.ts         configuração do login (servidor / navegador)
    sessao.ts                        obterSessao(), exigirSessao(papeis), autorizarAcao(papeis)
    acao.ts                          executarAcao(): erros amigáveis + refresh da tela
    formato.ts                       preço (R$ ⇄ centavos), duração, dias da semana
    regras.ts                        regras de agendamento (passo, antecedência, limites…)
    fuso.ts                          horário do salão ⇄ UTC
    disponibilidade.ts               cálculo de horários livres (função pura + testes)
drizzle/                             migrations SQL
scripts/seed.ts                      dados iniciais
```

## Regras garantidas pelo banco

- A mesma **profissional** não pode ter dois agendamentos sobrepostos.
- A mesma **cliente** não pode ter dois agendamentos sobrepostos.
- Agendamentos `cancelado` ou `faltou` liberam o horário.
- Cadastro público sempre cria `papel = cliente`; o papel não pode ser enviado pelo formulário.

(Ver `drizzle/0001_regras_agendamento.sql`.)

## Regras de agendamento (`src/lib/regras.ts`)

| Regra | Valor atual |
|---|---|
| Horários oferecidos a cada | 15 min |
| Antecedência mínima | 60 min |
| Agenda aberta para os próximos | 30 dias |
| Agendamentos futuros por cliente | máx. 3 |
| Cancelamento pelo site | até 2h antes |

Novos agendamentos entram como **pendente** (aguardando confirmação do salão). Em "qualquer profissional", o sistema escolhe quem fica com o horário colado a outro atendimento (menos buracos na agenda) e, em empate, quem tem menos atendimentos no dia.

## Convenções

- **Permissão em dois lugares:** páginas usam `exigirSessao(["dona"])` e **toda** Server Action chama `autorizarAcao([...])`, pois actions podem ser chamadas diretamente, sem passar pela página.
- **Cache Components (Next 16):** tudo que lê sessão, `params` ou banco fica dentro de `<Suspense>`. Depois de alterar dados, `executarAcao()` chama `refresh()`.
- **Dinheiro em centavos** (`precoCentavos`), horários em UTC no banco.
- **Subselects nos campos do `select` do Drizzle:** escreva os nomes de tabela explicitamente (`"profissionais"."id"`) — nesse lugar o Drizzle não qualifica as colunas e a comparação pode cair na tabela errada.
- **A disponibilidade é sempre recalculada no servidor** ao confirmar; o horário enviado pela tela nunca é aceito sem checagem.
- Nada é apagado de verdade em serviços/profissionais: usa-se `ativo = false`, para preservar o histórico.

### Comandos úteis do banco

```bash
docker compose ps                     # status do container
docker compose logs -f db             # logs
docker compose exec db psql -U salao -d agendamento   # abrir o psql
docker compose down                   # parar (mantém os dados)
docker compose down -v                # parar e APAGAR os dados
```

Para conectar por um cliente externo (DBeaver, TablePlus etc.): host `localhost`, porta `55432`, usuário `salao`, senha `salao_dev`, banco `agendamento`.

> Os scripts em `docker/postgres/init/` rodam só na primeira criação do volume (ex.: extensão `btree_gist`, usada para impedir agendamentos sobrepostos).

## Gestão do salão

A dona acessa estas telas pela barra lateral do painel:

- **Visão geral:** agenda do dia, horários pendentes de confirmação e entradas do caixa.
- **Configurações:** nome, slogan, apresentação, endereço, cidade, telefone, WhatsApp, Instagram e e-mail. Ao salvar, o site atualiza os contatos e a identidade. No Instagram, informe apenas o usuário, com ou sem `@`.
- **Clientes:** contatos, ficha interna (preferências, fórmula de coloração, alergias e observações) e histórico de agendamentos.
- **Estoque:** produtos, saldos, estoque mínimo, validade, movimentações e ficha técnica por serviço. Quantidades são expressas em ml, g ou unidades; o custo unitário é informado em centavos. Selecione entrada ou saída e informe uma quantidade positiva para movimentar o saldo. Ao concluir um atendimento, os produtos da ficha técnica são baixados automaticamente.
- **Financeiro:** caixa por dia, entradas e despesas manuais, comissões por profissional e edição do percentual para atendimentos futuros. Concluir o atendimento gera uma entrada e congela a comissão. Pagar a comissão exige registrar a saída correspondente no caixa.
- **Indicadores:** período de consulta, atendimentos concluídos, receita e ticket médio de serviços, cancelamentos, faltas e saldo do caixa. A agenda é filtrada pela data do atendimento e o caixa pela data de competência do lançamento.

As telas de gestão e suas ações são restritas ao papel `dona`. Profissionais continuam com acesso à própria agenda e às conversas autorizadas.

**Os contatos do seed são fictícios e servem apenas para demonstração.** Antes de usar o site com clientes, substitua-os em **Painel → Configurações**. Apagar um campo de contato remove o respectivo link do site. Os dados reais não estão incluídos no repositório.

## Lista de espera

Na etapa de escolha do horário, selecione serviço, profissional e dia e use **Avise-me se abrir vaga**. É necessário entrar na conta. Escolha manhã, tarde ou qualquer período; pedidos idênticos pendentes não são duplicados.

Quando um cancelamento, remarcação ou remoção de bloqueio libera horário compatível, o sistema adiciona um aviso à fila de e-mails. O aviso não reserva o horário: a cliente precisa voltar ao site e confirmar o agendamento. A entrega depende do worker descrito abaixo.

## Envio dos lembretes

A confirmação pela equipe agenda um lembrete para 24 horas antes do atendimento (ou imediatamente, se já faltar menos de 24h). Remarcar atualiza também o texto do lembrete; cancelar ou concluir remove lembretes pendentes.

Configure no `.env`:

```dotenv
RESEND_API_KEY=sua-chave
LEMBRETES_REMETENTE=Nome do Salão <agenda@seu-dominio.com.br>
```

O remetente deve pertencer a um domínio verificado no [Resend](https://resend.com/docs/api-reference/emails/send-email). Para consultar a fila sem enviar mensagens nem alterar registros:

```bash
npm run lembretes -- --simular
```

Para enviar até 100 notificações vencidas por execução:

```bash
npm run lembretes
```

Agende esse comando no cron ou no agendador da hospedagem, por exemplo a cada cinco minutos, executando no diretório do projeto. O comando não cria um serviço permanente. Sem as credenciais, ele encerra com erro e preserva a fila.

Cada mensagem é bloqueada durante o processamento (`SKIP LOCKED`), permitindo workers concorrentes. O envio usa [chave de idempotência do Resend](https://resend.com/docs/dashboard/emails/idempotency-keys), válida por 24h; não há garantia de entrega exatamente uma vez se o processo falhar após o provedor aceitar e a nova tentativa ocorrer depois desse prazo. Falhas ficam em `notificacoes.erro`, sem preencher `enviado_em`, para nova tentativa. Lembretes de atendimentos passados ou fora dos status pendente/confirmado são descartados. Contatos sem e-mail real e notificações WhatsApp ficam com erro: o transporte implementado é e-mail.

## Verificação e testes no navegador

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

O build baixa as fontes do Google. Em ambientes onde o Turbopack não consegue criar seus processos auxiliares, use `npm run build -- --webpack`.

O teste de ponta a ponta usa Playwright e Chrome, com banco migrado, catálogo e conta da dona criados pelo seed e app já rodando em `http://localhost:3000`:

```bash
npm run dev
# em outro terminal
npm run test:e2e
```

Por padrão, o executável é `/usr/bin/google-chrome`; use `CHROME_PATH` para outro caminho e `E2E_BASE_URL` para outro endereço. O login administrativo usa `SEED_DONA_EMAIL` e `SEED_DONA_SENHA` do `.env`.

**Execute em ambiente de desenvolvimento/teste:** o teste cria uma cliente e registros temporários, altera brevemente o nome do salão e restaura os dados ao concluir. Cobre página inicial e menu móvel, permissões, cadastro, reserva e cancelamento, lista de espera sem duplicação e geração do aviso de vaga, troca de mensagens, configurações, ficha da cliente, estoque, consumo ao concluir, caixa, indicadores e processamento da fila com transporte simulado. Não envia e-mails reais. Capturas e traces de falhas ficam em `test-results/` (ignorado pelo Git).
