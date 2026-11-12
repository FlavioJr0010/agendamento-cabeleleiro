import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirSessao } from "@/lib/sessao";
import { BotaoSair } from "./botao-sair";

export const metadata: Metadata = { title: "Minha conta" };

const NOME_PAPEL = { cliente: "Cliente", profissional: "Profissional", dona: "Administração" } as const;

export default function PaginaConta() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <Suspense fallback={<Carregando />}>
          <DadosConta />
        </Suspense>
      </div>
    </div>
  );
}

async function DadosConta() {
  const { user } = await exigirSessao();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name}</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Perfil</dt>
        <dd className="font-medium">{NOME_PAPEL[user.papel as keyof typeof NOME_PAPEL] ?? user.papel}</dd>
        <dt className="text-muted">WhatsApp</dt>
        <dd className="font-medium">{user.telefone || "—"}</dd>
      </dl>
      <div className="mt-6 flex flex-col gap-3">
        {user.papel === "dona" && (
          <Link
            href="/painel"
            className="grid h-11 place-items-center rounded-lg bg-primary font-medium text-primary-foreground hover:opacity-90"
          >
            Abrir painel do salão
          </Link>
        )}
        <Link
          href="/meus-agendamentos"
          className="grid h-11 place-items-center rounded-lg border border-border font-medium hover:bg-border/40"
        >
          Meus agendamentos
        </Link>
        <BotaoSair />
      </div>
    </>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-7 w-2/3 animate-pulse rounded bg-border/60" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
      <div className="mt-4 h-16 animate-pulse rounded bg-border/60" />
    </div>
  );
}
