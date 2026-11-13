import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Conversa } from "@/components/conversa/conversa";
import { CabecalhoPagina, Esqueleto } from "@/components/ui";
import { obterThread } from "@/db/consultas/mensagens";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Conversa" };

export default function PaginaConversa({ params }: PageProps<"/mensagens/[id]">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Esqueleto linhas={5} />}>
        <Conteudo params={params} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ params }: { params: PageProps<"/mensagens/[id]">["params"] }) {
  const { user } = await exigirSessao();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const thread = await obterThread({ id: user.id, papel: user.papel as string }, id);
  if (!thread) notFound();

  return (
    <>
      <CabecalhoPagina titulo={thread.assunto} voltar={{ href: "/mensagens", rotulo: "Mensagens" }} />
      <Conversa thread={thread} usuarioId={user.id} visaoEquipe={false} />
    </>
  );
}
