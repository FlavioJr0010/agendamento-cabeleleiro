import { CalendarPlus, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { obterConfiguracoes } from "@/lib/salao";
import { obterSessao } from "@/lib/sessao";
import { Marca } from "./marca";
import { MenuMovel } from "./menu-movel";

const LINKS = [
  { href: "/servicos", rotulo: "Serviços" },
  { href: "/#equipe", rotulo: "Equipe" },
  { href: "/#espaco", rotulo: "O espaço" },
  { href: "/#contato", rotulo: "Contato" },
];

export async function CabecalhoSite() {
  const config = await obterConfiguracoes();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Marca nome={config.nome} />
        <nav aria-label="Principal" className="hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-muted transition-colors hover:text-foreground">
              {l.rotulo}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="h-10 w-24 animate-pulse rounded-full bg-surface" />}>
            <AcoesUsuario />
          </Suspense>
          <Link
            href="/agendar"
            className="hidden h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:inline-flex"
          >
            <CalendarPlus className="size-4" aria-hidden />
            Agendar
          </Link>
          <MenuMovel
            links={[{ href: "/agendar", rotulo: "Agendar horário" }, ...LINKS]}
            rodape={
              <Link
                href="/agendar"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground"
              >
                <CalendarPlus className="size-4" aria-hidden />
                Agendar horário
              </Link>
            }
          />
        </div>
      </div>
    </header>
  );
}

async function AcoesUsuario() {
  const sessao = await obterSessao();
  const estilo =
    "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors hover:bg-surface";

  if (!sessao) {
    return (
      <Link href="/entrar" className={estilo}>
        <UserRound className="size-4" aria-hidden />
        Entrar
      </Link>
    );
  }

  const equipe = sessao.user.papel === "dona" || sessao.user.papel === "profissional";
  return (
    <>
      {equipe && (
        <Link href="/painel" className={`${estilo} text-primary`}>
          <LayoutDashboard className="size-4" aria-hidden />
          <span className="hidden sm:inline">Painel</span>
        </Link>
      )}
      <Link href="/conta" className={estilo} aria-label="Minha conta">
        <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {sessao.user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate lg:inline">{sessao.user.name.split(" ")[0]}</span>
      </Link>
    </>
  );
}
