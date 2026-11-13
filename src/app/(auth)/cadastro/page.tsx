import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cartao, Esqueleto } from "@/components/ui";
import { destinoSeguro } from "@/lib/destino";
import { obterSessao } from "@/lib/sessao";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro({ searchParams }: PageProps<"/cadastro">) {
  return (
    <Cartao titulo="Criar conta" subtitulo="Leva menos de um minuto.">
      <Suspense fallback={<Esqueleto linhas={5} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Cartao>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/cadastro">["searchParams"] }) {
  const { voltar } = await searchParams;
  const destino = destinoSeguro(typeof voltar === "string" ? voltar : null);
  if (await obterSessao()) redirect(destino);

  return (
    <>
      <FormCadastro destino={destino} />
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href={destino === "/conta" ? "/entrar" : `/entrar?voltar=${encodeURIComponent(destino)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
