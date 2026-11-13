"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { EstadoAcao } from "@/lib/acao";

type Props = {
  action: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  children: ReactNode;
  className?: string;
  /** Limpa os campos após sucesso (formulários de "novo"). */
  limparAoConcluir?: boolean;
  /** Pede confirmação antes de enviar. */
  confirmar?: string;
  /** Não mostra a mensagem de sucesso (ex.: botões pequenos de lista). */
  silencioso?: boolean;
};

/**
 * Formulário ligado a uma Server Action: desabilita os campos enquanto envia,
 * mostra erro/sucesso e NÃO apaga o que foi digitado quando há erro.
 */
export function FormAcao({ action, children, className, limparAoConcluir, confirmar, silencioso }: Props) {
  const [estado, executar, pendente] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok && limparAoConcluir) ref.current?.reset();
  }, [estado, limparAoConcluir]);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pendente || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const dados = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => executar(dados));
      }}
    >
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
      {estado && !estado.ok && (
        <p role="alert" className="col-span-full flex basis-full items-start gap-2 rounded-xl bg-danger/8 px-3 py-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {estado.erro}
        </p>
      )}
      {estado?.ok && estado.mensagem && !silencioso && (
        <p
          role="status"
          className="col-span-full flex basis-full items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
