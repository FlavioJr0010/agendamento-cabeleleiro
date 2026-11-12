import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cartao, Esqueleto } from "@/components/ui";
import { destinoSeguro } from "@/lib/destino";
import { obterSessao } from "@/lib/sessao";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <Cartao titulo="Entrar">
      <Suspense fallback={<Esqueleto linhas={3} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Cartao>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { voltar } = await searchParams;
  const destino = destinoSeguro(typeof voltar === "string" ? voltar : null);
  if (await obterSessao()) redirect(destino);

  return (
    <>
      <FormEntrar destino={destino} />
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link
          href={destino === "/conta" ? "/cadastro" : `/cadastro?voltar=${encodeURIComponent(destino)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
