import { SquarePen } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AoVivo } from "@/components/conversa/ao-vivo";
import { ListaConversas } from "@/components/conversa/lista-conversas";
import { FormAcao } from "@/components/form-acao";
import { AreaCliente } from "@/components/site/area-cliente";
import { AreaTexto, Botao, Campo, Esqueleto, Secao, Selecao } from "@/components/ui";
import { listarAgendamentosDaCliente } from "@/db/consultas/agenda";
import { listarThreads } from "@/db/consultas/mensagens";
import { formatarDataHora } from "@/lib/fuso";
import { iniciarConversa } from "@/lib/mensagens-actions";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Mensagens" };

export default function PaginaMensagens({ searchParams }: PageProps<"/mensagens">) {
  return (
    <AreaCliente titulo="Mensagens" descricao="Converse com o salão sobre seus horários ou tire dúvidas.">
      <Suspense fallback={<Esqueleto linhas={4} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </AreaCliente>
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="conversas" className="min-w-0">
        <h2 id="conversas" className="mb-4 text-lg font-semibold">
          Suas conversas
        </h2>
        <ListaConversas itens={conversas} base="/mensagens" />
      </section>

      <Secao
        className="lg:sticky lg:top-24 lg:order-none order-first"
        icone={<SquarePen />}
        titulo="Nova conversa"
        descricao="A equipe responde aqui mesmo."
      >
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
            <Selecao
              id="agendamentoId"
              rotulo="Sobre um agendamento"
              vazio={false}
              defaultValue={agendamentoPre?.id ?? ""}
              opcoes={[
                { valor: "", rotulo: "Nenhum — dúvida geral" },
                ...proximos.map((a) => ({ valor: a.id, rotulo: `${a.servico} — ${formatarDataHora(a.inicio)}` })),
              ]}
            />
          )}
          <AreaTexto rotulo="Mensagem" id="mensagem" required rows={4} maxLength={2000} placeholder="Escreva sua mensagem…" />
          <Botao type="submit" className="w-full">
            Enviar mensagem
          </Botao>
        </FormAcao>
      </Secao>
      <AoVivo />
    </div>
  );
}
