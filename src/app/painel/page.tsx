import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui";
import { resumoPainel } from "@/db/consultas/painel";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Painel" };

export default function PaginaPainel() {
  return (
    <Suspense fallback={<Esqueleto linhas={3} />}>
      <Resumo />
    </Suspense>
  );
}

async function Resumo() {
  const { user } = await exigirSessao(["dona"]);
  const r = await resumoPainel();
  // Uma linha por profissional, com todas as pendências dela.
  const porProfissional = new Map<string, { id: string; nome: string; faltas: string[] }>();
  for (const [lista, falta] of [
    [r.semServicos, "serviços"],
    [r.semExpediente, "expediente"],
  ] as const) {
    for (const p of lista) {
      const item = porProfissional.get(p.id) ?? { id: p.id, nome: p.nome, faltas: [] };
      item.faltas.push(falta);
      porProfissional.set(p.id, item);
    }
  }
  const pendencias = [...porProfissional.values()];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name.split(" ")[0]}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Indicador titulo="Serviços ativos" valor={r.servicosAtivos} href="/painel/servicos" acao="Gerenciar serviços" />
        <Indicador
          titulo="Profissionais ativas"
          valor={r.profissionaisAtivas}
          href="/painel/profissionais"
          acao="Gerenciar profissionais"
        />
      </div>

      {pendencias.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">Falta configurar</h2>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
            Profissionais sem serviços ou sem expediente não aparecem para agendamento.
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {pendencias.map((p) => (
              <li key={p.id}>
                <Link href={`/painel/profissionais/${p.id}`} className="font-medium underline underline-offset-4">
                  {p.nome}
                </Link>{" "}
                — falta cadastrar {p.faltas.join(" e ")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Indicador({ titulo, valor, href, acao }: { titulo: string; valor: number; href: string; acao: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{valor}</p>
      <p className="mt-3 text-sm font-medium text-primary group-hover:underline">{acao} →</p>
    </Link>
  );
}
