"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth-client";

export function BotaoSair({ variante = "botao", icone }: { variante?: "botao" | "menu"; icone?: ReactNode }) {
  const router = useRouter();
  const estilo =
    variante === "menu"
      ? "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
      : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border font-medium text-muted transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger";

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className={estilo}
    >
      {icone}
      Sair
    </button>
  );
}
