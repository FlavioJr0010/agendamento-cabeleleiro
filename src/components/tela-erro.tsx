"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { classeBotao } from "./ui";

/** Conteúdo padrão dos limites de erro (error.tsx). */
export function TelaErro({ error, retry, inicio = "/" }: { error: Error & { digest?: string }; retry: () => void; inicio?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-6 text-3xl tracking-tight">Algo não saiu como esperado</h1>
      <p className="mt-3 text-pretty text-muted">
        Não conseguimos carregar esta tela agora. Tente novamente em alguns instantes; se persistir, fale com o suporte.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">Código: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={classeBotao()}>
          <RotateCcw aria-hidden /> Tentar novamente
        </button>
        <Link href={inicio} className={classeBotao("secundario")}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
