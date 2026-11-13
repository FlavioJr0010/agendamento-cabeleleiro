"use client";

import { CalendarDays, MessagesSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

const ABAS = [
  { href: "/meus-agendamentos", rotulo: "Agendamentos", icone: CalendarDays },
  { href: "/mensagens", rotulo: "Mensagens", icone: MessagesSquare },
  { href: "/conta", rotulo: "Minha conta", icone: UserRound },
] as const;

/** Moldura das páginas da cliente: título, ações e abas de navegação. */
export function AreaCliente({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">{titulo}</h1>
          {descricao && <p className="mt-2 text-muted">{descricao}</p>}
        </div>
        {acoes}
      </div>
      <Suspense fallback={<div className="mt-6 h-11 border-b border-border" />}>
        <AbasCliente />
      </Suspense>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function AbasCliente() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Área da cliente"
      className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1 border-b border-border">
        {ABAS.map(({ href, rotulo, icone: Icone }) => {
          const ativa = caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativa
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:border-border hover:text-foreground"
                }`}
              >
                <Icone className="size-4" aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
