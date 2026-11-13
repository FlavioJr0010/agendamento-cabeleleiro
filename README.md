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
