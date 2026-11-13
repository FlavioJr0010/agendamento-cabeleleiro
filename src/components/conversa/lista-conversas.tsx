import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Selo, Vazio } from "@/components/ui";
import type { listarThreads } from "@/db/consultas/mensagens";
import { dataLocal, hojeNoSalao, horaLocal, partesDia } from "@/lib/fuso";

type Item = Awaited<ReturnType<typeof listarThreads>>[number];

const STATUS = {
  aberta: { rotulo: "Aguardando salão", tom: "alerta" },
  aguardando_cliente: { rotulo: "Respondida", tom: "sucesso" },
  encerrada: { rotulo: "Encerrada", tom: "neutro" },
} as const;

export function ListaConversas({ itens, base, mostrarCliente }: { itens: Item[]; base: string; mostrarCliente?: boolean }) {
  if (itens.length === 0) {
    return <Vazio icone={<MessagesSquare />} titulo="Nenhuma conversa por aqui" texto="Quando houver mensagens, elas aparecem nesta lista." />;
  }
  const hoje = hojeNoSalao();
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      {itens.map((t) => {
        const dia = dataLocal(t.ultimaMensagemEm);
        const quando = dia === hoje ? horaLocal(t.ultimaMensagemEm) : `${partesDia(dia).dia}/${dia.slice(5, 7)}`;
        return (
          <li key={t.id}>
            <Link href={`${base}/${t.id}`} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface/60">
              <span className="font-display grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-lg text-primary">
                {(mostrarCliente ? t.clienteNome : t.assunto).trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`truncate ${t.naoLidas > 0 ? "font-semibold" : "font-medium"}`}>
                    {mostrarCliente ? t.clienteNome : t.assunto}
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{quando}</span>
                </span>
                {mostrarCliente && <span className="block truncate text-sm">{t.assunto}</span>}
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={`truncate text-sm ${t.naoLidas > 0 ? "text-foreground" : "text-muted"}`}>
                    {t.ultimaMensagem}
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <Selo tom={STATUS[t.status].tom}>{STATUS[t.status].rotulo}</Selo>
                  {t.agendamentoId && <Selo>Sobre um agendamento</Selo>}
                </span>
              </span>
              {t.naoLidas > 0 && (
                <span className="mt-1 grid min-w-6 place-items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {t.naoLidas}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
