import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, Esqueleto } from "@/components/ui";
import { listarEquipe, listarServicosDisponiveis } from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Serviços e equipe",
  description: "Serviços, preços e profissionais do salão.",
};

export default function PaginaServicos() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Serviços e preços</h1>
      <p className="mt-1 text-muted">Escolha um serviço para ver os horários livres.</p>
      <Suspense fallback={<div className="mt-6"><Esqueleto linhas={4} /></div>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const [servicos, equipe] = await Promise.all([listarServicosDisponiveis(), listarEquipe()]);

  return (
    <>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {servicos.map((s) => (
          <li key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{s.nome}</h2>
              <span className="font-semibold tabular-nums">{formatarPreco(s.precoCentavos)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{formatarDuracao(s.duracaoMin)}</p>
            {s.descricao && <p className="mt-2 text-sm">{s.descricao}</p>}
            <Link
              href={`/agendar?servico=${s.id}`}
              className="mt-4 inline-flex h-10 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Agendar
            </Link>
          </li>
        ))}
        {servicos.length === 0 && <p className="text-muted">Nenhum serviço disponível no momento.</p>}
      </ul>

      {equipe.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Nossa equipe</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipe.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} />
                  <h3 className="font-semibold">{p.nome}</h3>
                </div>
                {p.bio && <p className="mt-3 text-sm">{p.bio}</p>}
                {p.servicos.length > 0 && <p className="mt-2 text-sm text-muted">{p.servicos.join(" · ")}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
