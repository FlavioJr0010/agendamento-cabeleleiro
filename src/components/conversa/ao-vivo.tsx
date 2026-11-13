"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { lerConversa } from "@/lib/mensagens-actions";

/**
 * Escuta novas mensagens (SSE) e atualiza a tela. Se `threadId` for informado,
 * só reage àquela conversa e a marca como lida.
 */
export function AoVivo({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (threadId) void lerConversa(threadId);
    const fonte = new EventSource("/api/mensagens/eventos");
    fonte.addEventListener("mensagem", (e) => {
      const { threadId: alvo } = JSON.parse((e as MessageEvent).data) as { threadId: string };
      if (threadId && alvo !== threadId) {
        router.refresh(); // atualiza contadores
        return;
      }
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(async () => {
        if (threadId) await lerConversa(threadId);
        router.refresh();
      }, 250);
    });
    return () => {
      fonte.close();
      if (espera.current) clearTimeout(espera.current);
    };
  }, [router, threadId]);

  return null;
}
