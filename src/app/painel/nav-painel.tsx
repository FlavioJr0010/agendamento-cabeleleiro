"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/painel", rotulo: "Visão geral", exato: true },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/profissionais", rotulo: "Profissionais" },
];

export function NavPainel() {
  const caminho = usePathname();

  return (
    <nav aria-label="Seções do painel" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-border">
        {ITENS.map(({ href, rotulo, exato }) => {
          const ativo = exato ? caminho === href : caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  ativo ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function NavPainelEstatico() {
  return (
    <ul className="flex gap-1 border-b border-border">
      {ITENS.map(({ href, rotulo }) => (
        <li key={href} className="px-3 py-2 text-sm font-medium text-muted">
          {rotulo}
        </li>
      ))}
    </ul>
  );
}
