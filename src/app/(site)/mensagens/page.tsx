import type { Metadata } from "next";
import { Suspense } from "react";
import { AoVivo } from "@/components/conversa/ao-vivo";
import { ListaConversas } from "@/components/conversa/lista-conversas";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Botao, CabecalhoPagina, Campo, Esqueleto, Secao } from "@/components/ui";
import { listarAgendamentosDaCliente } from "@/db/consultas/agenda";
import { listarThreads } from "@/db/consultas/mensagens";
import { formatarDataHora } from "@/lib/fuso";
import { iniciarConversa } from "@/lib/mensagens-actions";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Mensagens" };

export default function PaginaMensagens({ searchParams }: PageProps<"/mensagens">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <CabecalhoPagina titulo="Mensagens" descricao="Converse com o salão sobre seus horários ou tire dúvidas." />
      <Suspense fallback={<Esqueleto linhas={4} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/mensagens">["searchParams"] }) {
  const { user } = await exigirSessao();
  const { agendamento } = await searchParams;
  const [conversas, { proximos }] = await Promise.all([
    listarThreads({ id: user.id, papel: user.papel as string }),
    listarAgendamentosDaCliente(user.id),
  ]);
  const agendamentoPre = typeof agendamento === "string" ? proximos.find((a) => a.id === agendamento) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <Secao titulo="Nova conversa" descricao="A equipe responde aqui mesmo — você recebe a resposta nesta página.">
        <FormAcao action={iniciarConversa} className="flex flex-col gap-4">
          <Campo
            rotulo="Assunto"
            id="assunto"
            required
            maxLength={120}
            defaultValue={agendamentoPre ? `Sobre ${agendamentoPre.servico}` : ""}
            placeholder="Ex.: Dúvida sobre coloração"
          />
          {proximos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agendamentoId" className="text-sm font-medium">
                Sobre um agendamento (opcional)
              </label>
              <select
                id="agendamentoId"
                name="agendamentoId"
                defaultValue={agendamentoPre?.id ?? ""}
                className="h-11 rounded-xl border border-border bg-card px-3 text-base"
              >
                <option value="">Nenhum — dúvida geral</option>
                {proximos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.servico} — {formatarDataHora(a.inicio)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <AreaTexto rotulo="Mensagem" id="mensagem" required maxLength={2000} placeholder="Escreva sua mensagem…" />
          <div>
            <Botao type="submit">Enviar mensagem</Botao>
          </div>
        </FormAcao>
      </Secao>

      <section>
        <h2 className="font-display mb-4 text-2xl">Suas conversas</h2>
        <ListaConversas itens={conversas} base="/mensagens" />
      </section>
      <AoVivo />
    </div>
  );
}
