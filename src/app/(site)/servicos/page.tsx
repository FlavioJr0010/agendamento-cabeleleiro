import { ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, Vazio } from "@/components/ui";
import { listarEquipe, listarServicosDisponiveis } from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { imagemDoServico } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Serviços e equipe",
  description: "Serviços, preços e profissionais do salão.",
};

export default function PaginaServicos() {
  return (
    <>
      <section className="border-b border-border bg-surface/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Serviços</p>
          <h1 className="font-display mt-2 text-4xl tracking-tight sm:text-5xl">Serviços e preços</h1>
          <p className="mt-3 max-w-xl text-muted">Valores e duração de cada atendimento. Escolha um serviço para ver os horários livres.</p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-3xl bg-surface" />
              ))}
            </div>
          }
        >
          <Conteudo />
        </Suspense>
      </div>
    </>
  );
}

async function Conteudo() {
  const [servicos, equipe] = await Promise.all([listarServicosDisponiveis(), listarEquipe()]);

  return (
    <>
      {servicos.length === 0 ? (
        <Vazio titulo="Nenhum serviço disponível no momento" texto="Volte em breve ou fale com o salão pelos contatos no rodapé." />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <li key={s.id}>
              <Link
                href={`/agendar?servico=${s.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                  <Image
                    src={imagemDoServico(s)}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl">{s.nome}</h2>
                    <span className="shrink-0 font-semibold tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="size-3.5" aria-hidden /> {formatarDuracao(s.duracaoMin)}
                  </p>
                  {s.descricao && <p className="mt-3 text-sm leading-relaxed text-muted">{s.descricao}</p>}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary">
                    Ver horários <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {equipe.length > 0 && (
        <section className="mt-20" aria-labelledby="equipe">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Equipe</p>
          <h2 id="equipe" className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
            Quem cuida de você
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {equipe.map((p) => (
              <li key={p.id} className="flex flex-col rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} />
                  <div className="min-w-0">
                    <h3 className="font-display text-xl">{p.nome}</h3>
                    {p.servicos.length > 0 && <p className="truncate text-xs text-muted">{p.servicos.join(" · ")}</p>}
                  </div>
                </div>
                {p.bio && <p className="mt-4 text-sm leading-relaxed text-muted">{p.bio}</p>}
                <Link
                  href="/agendar"
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary hover:underline"
                >
                  Agendar <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
