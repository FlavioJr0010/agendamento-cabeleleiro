"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Botao, Campo, Erro } from "@/components/ui";
import { signIn } from "@/lib/auth-client";

export function FormEntrar({ destino }: { destino: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // onSubmit (e não <form action>) para NÃO limpar os campos quando há erro.
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErro(null);
    setEnviando(true);
    try {
      const { data, error } = await signIn.email({
        email: String(formData.get("email")),
        password: String(formData.get("senha")),
      });
      if (error) {
        setErro(error.status === 401 ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente.");
        return;
      }
      // Sem destino específico, a dona vai direto para o painel.
      router.push(destino === "/conta" && data?.user.papel === "dona" ? "/painel" : destino);
      router.refresh();
    } catch {
      setErro("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo rotulo="E-mail" id="email" type="email" autoComplete="email" required />
      <Campo rotulo="Senha" id="senha" type="password" autoComplete="current-password" required />
      <Erro>{erro}</Erro>
      <Botao type="submit" disabled={enviando} className="w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
