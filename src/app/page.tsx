import Link from "next/link";
import { Suspense } from "react";
import { obterSessao } from "@/lib/sessao";

const primario =
  "inline-flex h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground hover:opacity-90";
const secundario = "inline-flex h-12 items-center rounded-full border border-border px-6 font-medium hover:bg-border/40";

export default function Inicio() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Seu horário no salão, a poucos toques.
      </h1>
      <p className="max-w-lg text-lg text-muted">
        Escolha o serviço, a profissional e o melhor horário — e acompanhe seus agendamentos.
      </p>
      <div className="flex min-h-12 flex-wrap gap-3">
        <Link href="/agendar" className={primario}>
          Agendar horário
        </Link>
        <Suspense fallback={<Link href="/servicos" className={secundario}>Ver serviços e preços</Link>}>
          <AcaoSecundaria />
        </Suspense>
      </div>
    </section>
  );
}

async function AcaoSecundaria() {
  const sessao = await obterSessao();
  return sessao ? (
    <Link href="/meus-agendamentos" className={secundario}>
      Meus agendamentos
    </Link>
  ) : (
    <Link href="/servicos" className={secundario}>
      Ver serviços e preços
    </Link>
  );
}
