"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao, Campo, Erro } from "@/components/ui";
import { signUp } from "@/lib/auth-client";

export function FormCadastro({ destino }: { destino: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(formData: FormData) {
    setErro(null);
    const senha = String(formData.get("senha"));
    if (senha !== String(formData.get("confirmarSenha"))) {
      setErro("As senhas não conferem.");
      return;
    }

    setEnviando(true);
    const { error } = await signUp.email({
      name: String(formData.get("nome")).trim(),
      email: String(formData.get("email")).trim().toLowerCase(),
      telefone: String(formData.get("telefone")).trim() || undefined,
      password: senha,
    });
    setEnviando(false);

    if (error) {
      setErro(
        error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "Já existe uma conta com este e-mail."
          : error.code === "PASSWORD_TOO_SHORT"
            ? "A senha precisa ter pelo menos 8 caracteres."
            : "Não foi possível criar a conta. Tente novamente.",
      );
      return;
    }
    router.push(destino);
    router.refresh();
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Campo rotulo="Nome" id="nome" autoComplete="name" required />
      <Campo rotulo="E-mail" id="email" type="email" autoComplete="email" required />
      <Campo rotulo="WhatsApp" id="telefone" type="tel" autoComplete="tel" placeholder="(71) 90000-0000" />
      <Campo rotulo="Senha" id="senha" type="password" autoComplete="new-password" minLength={8} required />
      <Campo
        rotulo="Confirmar senha"
        id="confirmarSenha"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Erro>{erro}</Erro>
      <Botao type="submit" disabled={enviando} className="w-full">
        {enviando ? "Criando…" : "Criar conta"}
      </Botao>
    </form>
  );
}
