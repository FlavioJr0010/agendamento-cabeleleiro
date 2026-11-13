import { ChevronRight, Contact, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, ilike, max, or } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, user } from "@/db/schema";
import { TelaGestao } from "@/components/gestao";
import { Avatar, Botao, Secao, Tabela, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { dataLocal } from "@/lib/fuso";

export const metadata: Metadata = { title: "Clientes" };

export default function Pagina({ searchParams }: PageProps<"/painel/clientes">) {
  return (
    <TelaGestao titulo="Clientes" descricao="Contatos, histórico e ficha de atendimento de cada cliente.">
      <Conteudo searchParams={searchParams} />
    </TelaGestao>
  );
}

const semEmail = (email: string) => email.endsWith("@clientes.local");

function formatarData(d: Date | null) {
  if (!d) return "—";
  const [a, m, dia] = dataLocal(d).split("-");
  return `${dia}/${m}/${a}`;
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/clientes">["searchParams"] }) {
  await exigirSessao(["dona"]);
  const sp = await searchParams;
  const busca = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const termo = `%${busca.replace(/[%_\\]/g, "\\$&")}%`;

  const clientes = await db
    .select({
      id: user.id,
      nome: user.name,
      email: user.email,
      telefone: user.telefone,
      atendimentos: count(agendamentos.id),
      ultimo: max(agendamentos.inicio),
    })
    .from(user)
    .leftJoin(agendamentos, eq(agendamentos.clienteId, user.id))
    .where(
      and(
        eq(user.papel, "cliente"),
        busca ? or(ilike(user.name, termo), ilike(user.email, termo), ilike(user.telefone, termo)) : undefined,
      ),
    )
    .groupBy(user.id)
    .orderBy(asc(user.name));

  return (
    <Secao
      titulo={busca ? `Resultados para “${busca}”` : "Todas as clientes"}
      descricao={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`}
      acoes={
        <form role="search" className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="q" className="sr-only">
              Buscar cliente
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={busca}
              placeholder="Nome, e-mail ou telefone"
              className="h-9 w-56 rounded-full border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
            />
          </div>
          <Botao variante="secundario" tamanho="pequeno">
            Buscar
          </Botao>
        </form>
      }
      semEspaco
    >
      {clientes.length === 0 ? (
        <Vazio
          compacto
          icone={<Contact />}
          titulo={busca ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada"}
          texto={
            busca
              ? "Confira a grafia ou busque pelo telefone."
              : "As clientes aparecem aqui quando criam conta no site ou são cadastradas em um novo agendamento."
          }
          acao={
            busca ? (
              <Link href="/painel/clientes" className="text-sm font-medium text-primary hover:underline">
                Limpar busca
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Tabela rotulo="Clientes" colunas={["Cliente", "Telefone", "Agendamentos", "Último agendamento", <span key="a" className="sr-only">Abrir</span>]}>
          {clientes.map((c) => (
            <tr key={c.id} className="group relative transition-colors hover:bg-surface/60">
              <td>
                <div className="flex items-center gap-3">
                  <Avatar nome={c.nome} tamanho="pequeno" />
                  <div className="min-w-0">
                    <Link href={`/painel/clientes/${c.id}`} className="font-medium after:absolute after:inset-0">
                      {c.nome}
                    </Link>
                    <p className="truncate text-xs text-muted">{semEmail(c.email) ? "Sem e-mail" : c.email}</p>
                  </div>
                </div>
              </td>
              <td className="text-muted tabular-nums">{c.telefone || "—"}</td>
              <td className="tabular-nums">{c.atendimentos}</td>
              <td className="text-muted tabular-nums">{formatarData(c.ultimo)}</td>
              <td className="w-10 text-right">
                <ChevronRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </Secao>
  );
}
