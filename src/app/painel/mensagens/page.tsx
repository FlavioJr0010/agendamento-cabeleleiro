import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AoVivo } from "@/components/conversa/ao-vivo";
import { ListaConversas } from "@/components/conversa/lista-conversas";
import { CabecalhoPagina, Esqueleto } from "@/components/ui";
import { listarThreads } from "@/db/consultas/mensagens";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Mensagens" };

const FILTROS = [
  { valor: "aberta", rotulo: "Aguardando resposta" },
  { valor: "aguardando_cliente", rotulo: "Respondidas" },
  { valor: "encerrada", rotulo: "Encerradas" },
  { valor: "todas", rotulo: "Todas" },
] as const;

export default function PaginaMensagensEquipe({ searchParams }: PageProps<"/painel/mensagens">) {
  return (
    <>
      <CabecalhoPagina titulo="Mensagens" descricao="Conversas das clientes com o salão, em tempo real." />
      <Suspense fallback={<Esqueleto linhas={5} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/mensagens">["searchParams"] }) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const { status } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === status)?.valor ?? "aberta";
  const itens = await listarThreads(
    { id: user.id, papel: user.papel as string },
    filtro === "todas" ? undefined : filtro,
  );

  return (
    <>
      <nav aria-label="Filtrar conversas" className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/painel/mensagens?status=${f.valor}`}
            aria-current={filtro === f.valor ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filtro === f.valor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-surface"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>
      <ListaConversas itens={itens} base="/painel/mensagens" mostrarCliente />
      <AoVivo />
    </>
  );
}
