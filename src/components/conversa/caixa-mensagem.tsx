"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { FormAcao } from "@/components/form-acao";
import type { EstadoAcao } from "@/lib/acao";

/** Campo de resposta: Enter envia, Shift+Enter quebra linha. */
export function CaixaMensagem({
  action,
}: {
  action: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <FormAcao action={action} limparAoConcluir silencioso className="flex flex-wrap items-end gap-2">
      <label htmlFor="conteudo" className="sr-only">
        Mensagem
      </label>
      <textarea
        ref={ref}
        id="conteudo"
        name="conteudo"
        rows={1}
        required
        maxLength={2000}
        placeholder="Escreva uma mensagem…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none field-sizing-content focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        aria-label="Enviar"
        className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        <SendHorizontal className="size-5" aria-hidden />
      </button>
    </FormAcao>
  );
}
