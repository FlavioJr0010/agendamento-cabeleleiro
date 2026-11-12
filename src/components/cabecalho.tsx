import Link from "next/link";
import { Suspense } from "react";
import { obterSessao } from "@/lib/sessao";

const linkMenu = "rounded-full px-3 py-1.5 font-medium hover:bg-border/60";

/** Cabeçalho estático; só o menu do usuário (que depende da sessão) é dinâmico. */
export function Cabecalho() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="text-lg font-semibold text-primary">
          Salão
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/servicos" className={`${linkMenu} hidden sm:inline-block`}>
            Serviços
          </Link>
          <Suspense fallback={<div className="h-8 w-28 animate-pulse rounded-full bg-border/60" />}>
            <MenuUsuario />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function MenuUsuario() {
  const sessao = await obterSessao();

  if (sessao) {
    return (
      <>
        {sessao.user.papel === "dona" ? (
          <Link href="/painel" className={`${linkMenu} text-primary`}>
            Painel
          </Link>
        ) : (
          <Link href="/meus-agendamentos" className={linkMenu}>
            Meus horários
          </Link>
        )}
        <Link href="/conta" className={`${linkMenu} max-w-28 truncate`}>
          {sessao.user.name.split(" ")[0]}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/entrar" className={linkMenu}>
        Entrar
      </Link>
      <Link href="/agendar" className="rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">
        Agendar
      </Link>
    </>
  );
}
