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
| `npm run db:up` / `db:down` | Sobe / para o PostgreSQL no Docker |
| `npm run db:generate` | Gera migration a partir de mudanças em `src/db/schema/` |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:studio` | Abre o Drizzle Studio (navegar pelos dados) |
| `npm run db:seed` | Dados iniciais (idempotente) |

## Estrutura

```text
src/
  app/
    (auth)/entrar, (auth)/cadastro   telas de login e cadastro
    conta/                           área logada (minha conta)
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
drizzle/                             migrations SQL
scripts/seed.ts                      dados iniciais
```

## Regras garantidas pelo banco

- A mesma **profissional** não pode ter dois agendamentos sobrepostos.
- A mesma **cliente** não pode ter dois agendamentos sobrepostos.
- Agendamentos `cancelado` ou `faltou` liberam o horário.
- Cadastro público sempre cria `papel = cliente`; o papel não pode ser enviado pelo formulário.

(Ver `drizzle/0001_regras_agendamento.sql`.)

## Convenções

- **Permissão em dois lugares:** páginas usam `exigirSessao(["dona"])` e **toda** Server Action chama `autorizarAcao([...])`, pois actions podem ser chamadas diretamente, sem passar pela página.
- **Cache Components (Next 16):** tudo que lê sessão, `params` ou banco fica dentro de `<Suspense>`. Depois de alterar dados, `executarAcao()` chama `refresh()`.
- **Dinheiro em centavos** (`precoCentavos`), horários em UTC no banco.
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
