import { CalendarDays, Info } from "lucide-react";
import type { obterThread } from "@/db/consultas/mensagens";
import { dataLocal, formatarDataHora, formatarDiaLongo, horaLocal } from "@/lib/fuso";
import { enviarMensagem } from "@/lib/mensagens-actions";
import { AoVivo } from "./ao-vivo";
import { CaixaMensagem } from "./caixa-mensagem";
import { RolarParaFim } from "./rolar-para-fim";

type Thread = NonNullable<Awaited<ReturnType<typeof obterThread>>>;

/** Linha do tempo da conversa + campo de resposta. Usada pela cliente e pela equipe. */
export function Conversa({ thread, usuarioId, visaoEquipe }: { thread: Thread; usuarioId: string; visaoEquipe: boolean }) {
  const dias = thread.mensagens.map((m) => dataLocal(m.createdAt));
  return (
    <div className="flex min-h-[60dvh] flex-col overflow-hidden rounded-3xl border border-border bg-card">
      {thread.agendamentoId && thread.agendamentoInicio && (
        <div className="flex items-center gap-3 border-b border-border bg-surface/60 px-5 py-3 text-sm">
          <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong className="font-medium">{thread.servicoNome}</strong> com {thread.profissionalNome} —{" "}
            <span className="first-letter:uppercase">{formatarDataHora(thread.agendamentoInicio)}</span>
          </span>
        </div>
      )}

      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-6" aria-label="Mensagens">
        {thread.mensagens.map((m, i) => {
          const dia = dias[i];
          const separador = i === 0 || dia !== dias[i - 1];
          const minha = m.autorId === usuarioId;
          const daEquipe = m.autorPapel === "dona" || m.autorPapel === "profissional";
          return (
            <li key={m.id} className="flex flex-col">
              {separador && (
                <span className="my-2 self-center rounded-full bg-surface px-3 py-1 text-xs text-muted first-letter:uppercase">
                  {formatarDiaLongo(dia)}
                </span>
              )}
              {m.tipo === "sistema" ? (
                <p className="flex items-center gap-2 self-center rounded-2xl border border-dashed border-border px-4 py-2 text-center text-sm text-muted">
                  <Info className="size-4 shrink-0" aria-hidden />
                  {m.conteudo}
                </p>
              ) : (
                <div className={`flex max-w-[85%] flex-col ${minha ? "items-end self-end" : "items-start self-start"}`}>
                  {!minha && (
                    <span className="mb-1 px-1 text-xs text-muted">
                      {daEquipe && !visaoEquipe ? `${m.autorNome?.split(" ")[0] ?? "Salão"} · salão` : m.autorNome}
                    </span>
                  )}
                  <p
                    className={`rounded-2xl px-4 py-2.5 whitespace-pre-wrap break-words ${
                      minha ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-surface"
                    }`}
                  >
                    {m.conteudo}
                  </p>
                  <time className="mt-1 px-1 text-[0.7rem] text-muted" dateTime={m.createdAt.toISOString()}>
                    {horaLocal(m.createdAt)}
                  </time>
                </div>
              )}
            </li>
          );
        })}
        <RolarParaFim chave={thread.mensagens.length} />
      </ol>

      <div className="border-t border-border p-3 sm:p-4">
        {thread.status === "encerrada" && !visaoEquipe ? (
          <p className="text-center text-sm text-muted">
            Esta conversa foi encerrada pelo salão. Para um novo assunto, abra outra conversa.
          </p>
        ) : (
          <CaixaMensagem action={enviarMensagem.bind(null, thread.id)} />
        )}
      </div>
      <AoVivo threadId={thread.id} />
    </div>
  );
}
