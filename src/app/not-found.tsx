import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { classeBotao } from "@/components/ui";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="relative grid flex-1 place-items-center overflow-hidden px-6 py-24">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary-soft blur-3xl" />
      <div className="relative max-w-md text-center">
        <p className="font-display text-8xl tracking-tight text-primary italic">404</p>
        <h1 className="font-display mt-4 text-3xl tracking-tight sm:text-4xl">Página não encontrada</h1>
        <p className="mt-3 text-pretty text-muted">
          O endereço pode ter mudado ou o conteúdo não existe mais. Que tal voltar ao início ou já garantir seu horário?
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={classeBotao("secundario")}>
            <ArrowLeft aria-hidden /> Página inicial
          </Link>
          <Link href="/agendar" className={classeBotao()}>
            <CalendarPlus aria-hidden /> Agendar horário
          </Link>
        </div>
      </div>
    </main>
  );
}
