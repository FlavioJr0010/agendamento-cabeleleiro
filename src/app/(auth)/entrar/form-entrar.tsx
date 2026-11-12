"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao, Campo, Erro } from "@/components/ui";
import { signIn } from "@/lib/auth-client";

export function FormEntrar({ destino }: { destino: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(formData: FormData) {
    setErro(null);
    setEnviando(true);
    const { error } = await signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("senha")),
    });
    setEnviando(false);

    if (error) {
      setErro(error.status === 401 ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente.");
      return;
    }
    router.push(destino);
    router.refresh();
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Campo rotulo="E-mail" id="email" type="email" autoComplete="email" required />
      <Campo rotulo="Senha" id="senha" type="password" autoComplete="current-password" required />
      <Erro>{erro}</Erro>
      <Botao type="submit" disabled={enviando} className="w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
