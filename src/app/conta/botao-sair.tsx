"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function BotaoSair() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="h-11 w-full rounded-lg border border-border font-medium hover:bg-border/40"
    >
      Sair
    </button>
  );
}
