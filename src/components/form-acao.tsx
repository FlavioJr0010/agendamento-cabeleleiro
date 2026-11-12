"use client";

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
        <p role="alert" className="basis-full text-sm text-danger">
          {estado.erro}
        </p>
      )}
      {estado?.ok && estado.mensagem && !silencioso && (
        <p role="status" className="basis-full text-sm text-emerald-700 dark:text-emerald-400">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
