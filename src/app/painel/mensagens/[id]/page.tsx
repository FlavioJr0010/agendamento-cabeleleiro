import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Conversa } from "@/components/conversa/conversa";
import { FormAcao } from "@/components/form-acao";
import { Botao, CabecalhoPagina, Esqueleto } from "@/components/ui";
import { obterThread } from "@/db/consultas/mensagens";
import { alterarStatusConversa } from "@/lib/mensagens-actions";
import { linkWhatsapp } from "@/lib/salao";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Conversa" };

export default function PaginaConversaEquipe({ params }: PageProps<"/painel/mensagens/[id]">) {
  return (
    <Suspense fallback={<Esqueleto linhas={6} />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/painel/mensagens/[id]">["params"] }) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const thread = await obterThread({ id: user.id, papel: user.papel as string }, id);
  if (!thread) notFound();
  const whatsapp = linkWhatsapp(thread.clienteTelefone);
  const encerrada = thread.status === "encerrada";

  return (
    <>
      <CabecalhoPagina
        titulo={thread.assunto}
        descricao={<>Conversa com <strong className="font-medium text-foreground">{thread.clienteNome}</strong></>}
        voltar={{ href: "/painel/mensagens", rotulo: "Mensagens" }}
        acoes={
          <>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-surface"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            )}
            {thread.clienteTelefone && (
              <a
                href={`tel:${thread.clienteTelefone.replace(/\D/g, "")}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-surface"
              >
                <Phone className="size-4" aria-hidden /> Ligar
              </a>
            )}
            <FormAcao action={alterarStatusConversa.bind(null, thread.id, encerrada ? "aberta" : "encerrada")} silencioso>
              <Botao type="submit" variante="secundario" tamanho="pequeno">
                {encerrada ? "Reabrir" : "Encerrar conversa"}
              </Botao>
            </FormAcao>
          </>
        }
      />
      <Conversa thread={thread} usuarioId={user.id} visaoEquipe />
    </>
  );
}
