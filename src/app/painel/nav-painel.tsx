"use client";

import {
  BarChart3,
  Boxes,
  CalendarDays,
  Home,
  Menu,
  MessagesSquare,
  Scissors,
  Settings,
  UsersRound,
  Wallet,
  Contact,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Papel = "dona" | "profissional";

const ITENS = [
  { href: "/painel", rotulo: "Visão geral", icone: Home, papeis: ["dona"], exato: true },
  { href: "/painel/agenda", rotulo: "Agenda", icone: CalendarDays, papeis: ["dona", "profissional"] },
  { href: "/painel/mensagens", rotulo: "Mensagens", icone: MessagesSquare, papeis: ["dona", "profissional"] },
  { href: "/painel/clientes", rotulo: "Clientes", icone: Contact, papeis: ["dona"] },
  { grupo: "Cadastros", papeis: ["dona"] },
  { href: "/painel/servicos", rotulo: "Serviços", icone: Scissors, papeis: ["dona"] },
  { href: "/painel/profissionais", rotulo: "Profissionais", icone: UsersRound, papeis: ["dona"] },
  { href: "/painel/estoque", rotulo: "Estoque", icone: Boxes, papeis: ["dona"] },
  { grupo: "Gestão", papeis: ["dona"] },
  { href: "/painel/financeiro", rotulo: "Financeiro", icone: Wallet, papeis: ["dona"] },
  { href: "/painel/indicadores", rotulo: "Indicadores", icone: BarChart3, papeis: ["dona"] },
  { href: "/painel/configuracoes", rotulo: "Configurações", icone: Settings, papeis: ["dona"] },
] as const;

export function NavPainel({ papel, naoLidas = 0 }: { papel: Papel; naoLidas?: number }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Painel" className="flex flex-col gap-0.5">
      {ITENS.filter((i) => (i.papeis as readonly string[]).includes(papel)).map((item) => {
        if ("grupo" in item) {
          return (
            <p key={item.grupo} className="mt-5 mb-1 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted/80">
              {item.grupo}
            </p>
          );
        }
        const ativo = "exato" in item && item.exato ? caminho === item.href : caminho.startsWith(item.href);
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              ativo ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Icone className="size-[1.1rem] shrink-0" aria-hidden />
            <span className="flex-1">{item.rotulo}</span>
            {item.href === "/painel/mensagens" && naoLidas > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.7rem] font-semibold text-primary-foreground">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Gaveta com a navegação do painel em telas pequenas. */
export function GavetaPainel({ papel, naoLidas, topo }: { papel: Papel; naoLidas?: number; topo: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const caminho = usePathname();
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminho);
  if (caminho !== caminhoAnterior) {
    setCaminhoAnterior(caminho);
    setAberta(false);
  }
  useEffect(() => {
    if (!aberta) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu do painel"
        aria-expanded={aberta}
        className="relative grid size-10 place-items-center rounded-full hover:bg-surface lg:hidden"
      >
        <Menu className="size-5" />
        {naoLidas ? <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" /> : null}
      </button>
      {aberta && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setAberta(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-card p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              {topo}
              <button type="button" onClick={() => setAberta(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-full hover:bg-surface">
                <X className="size-5" />
              </button>
            </div>
            <NavPainel papel={papel} naoLidas={naoLidas} />
          </div>
        </div>
      )}
    </>
  );
}
