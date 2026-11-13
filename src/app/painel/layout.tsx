import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Marca } from "@/components/site/marca";
import { contarNaoLidasEquipe } from "@/db/consultas/mensagens";
import { obterConfiguracoes } from "@/lib/salao";
import { exigirSessao } from "@/lib/sessao";
import { BotaoSair } from "../(site)/conta/botao-sair";
import { GavetaPainel, NavPainel } from "./nav-painel";

/**
 * Layout do painel (dona e profissionais). A permissão é checada aqui para o
 * menu, e de novo em cada página e em cada Server Action.
 */
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const config = await obterConfiguracoes();
  const marca = <Marca nome={config.nome} />;

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="px-2">{marca}</div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <Suspense fallback={<EsqueletoMenu />}>
            <Menu />
          </Suspense>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <Suspense fallback={null}>
            <Usuario />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
          <Suspense fallback={<div className="size-10" />}>
            <MenuMovel topo={marca} />
          </Suspense>
          {marca}
          <Link href="/" className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Ver o site">
            <ExternalLink className="size-4" />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

async function Menu() {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const naoLidas = await contarNaoLidasEquipe(user.id, user.papel as "dona" | "profissional");
  return <NavPainel papel={user.papel as "dona" | "profissional"} naoLidas={naoLidas} />;
}

async function MenuMovel({ topo }: { topo: React.ReactNode }) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const naoLidas = await contarNaoLidasEquipe(user.id, user.papel as "dona" | "profissional");
  return <GavetaPainel papel={user.papel as "dona" | "profissional"} naoLidas={naoLidas} topo={topo} />;
}

async function Usuario() {
  const { user } = await exigirSessao(["dona", "profissional"]);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.papel === "dona" ? "Administração" : "Profissional"}</span>
        </span>
      </div>
      <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground">
        <ExternalLink className="size-4" aria-hidden />
        Ver o site
      </Link>
      <BotaoSair variante="menu" icone={<LogOut className="size-4" aria-hidden />} />
    </div>
  );
}

function EsqueletoMenu() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}
