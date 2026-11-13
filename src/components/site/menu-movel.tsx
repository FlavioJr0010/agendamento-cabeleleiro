"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** Menu em gaveta para telas pequenas. Fecha ao navegar e com Esc. */
export function MenuMovel({ links, rodape }: { links: { href: string; rotulo: string }[]; rodape?: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminho);
  if (caminho !== caminhoAnterior) {
    setCaminhoAnterior(caminho);
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className="grid size-10 place-items-center rounded-full hover:bg-surface"
      >
        <Menu className="size-5" />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setAberto(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-card p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="ml-auto grid size-10 place-items-center rounded-full hover:bg-surface"
            >
              <X className="size-5" />
            </button>
            <nav className="mt-4 flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setAberto(false)}
                  className="font-display border-b border-border py-3.5 text-xl"
                >
                  {l.rotulo}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 pt-6">{rodape}</div>
          </div>
        </div>
      )}
    </div>
  );
}
