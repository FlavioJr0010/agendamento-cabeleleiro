import { Suspense } from "react";
import { NavPainel, NavPainelEstatico } from "./nav-painel";

/**
 * Layout do painel da dona. A checagem de permissão é feita em cada página
 * (exigirSessao(["dona"])) e em cada Server Action (autorizarAcao(["dona"])).
 */
export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Painel do salão</p>
      <div className="mt-2 mb-6">
        <Suspense fallback={<NavPainelEstatico />}>
          <NavPainel />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
