import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { Botao, Esqueleto, Selo } from "@/components/ui";
import { listarAgendamentosDaCliente } from "@/db/consultas/agenda";
import { formatarPreco } from "@/lib/formato";
import { formatarDataHora } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { exigirSessao } from "@/lib/sessao";
import { cancelarAgendamento } from "./actions";

export const metadata: Metadata = { title: "Meus agendamentos" };

const STATUS = {
  pendente: { rotulo: "Aguardando confirmação", tom: "alerta" },
  confirmado: { rotulo: "Confirmado", tom: "sucesso" },
  em_atendimento: { rotulo: "Em atendimento", tom: "sucesso" },
  concluido: { rotulo: "Concluído", tom: "neutro" },
  faltou: { rotulo: "Não compareceu", tom: "neutro" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" },
} as const;

export default function PaginaMeusAgendamentos({ searchParams }: PageProps<"/meus-agendamentos">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meus agendamentos</h1>
        <Link
          href="/agendar"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:opacity-90"
        >
          Novo agendamento
        </Link>
      </div>
      <Suspense fallback={<div className="mt-6"><Esqueleto linhas={3} /></div>}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/meus-agendamentos">["searchParams"] }) {
  const { user } = await exigirSessao();
  const { novo } = await searchParams;
  const todos = await listarAgendamentosDaCliente(user.id);
  const agora = Date.now();

  const ativos = (s: string) => s === "pendente" || s === "confirmado" || s === "em_atendimento";
  const proximos = todos.filter((a) => ativos(a.status) && a.inicio.getTime() >= agora - 3 * 3_600_000).reverse();
  const historico = todos.filter((a) => !proximos.includes(a));

  return (
    <div className="mt-6 flex flex-col gap-8">
      {novo && (
        <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <strong>Pedido de agendamento enviado!</strong> O salão vai confirmar em breve.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos</h2>
        {proximos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-muted">
            Você não tem horários marcados.{" "}
            <Link href="/agendar" className="font-medium text-primary hover:underline">
              Agendar agora
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {proximos.map((a) => {
              const podeCancelar =
                (a.status === "pendente" || a.status === "confirmado") &&
                a.inicio.getTime() - agora > REGRAS.prazoCancelamentoHoras * 3_600_000;
              return (
                <li key={a.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{a.servico}</p>
                      <p className="text-sm text-muted">com {a.profissional}</p>
                    </div>
                    <Selo tom={STATUS[a.status].tom}>{STATUS[a.status].rotulo}</Selo>
                  </div>
                  <p className="mt-3 font-medium first-letter:uppercase">{formatarDataHora(a.inicio)}</p>
                  <p className="text-sm text-muted">{formatarPreco(a.precoCentavos)} · pagamento no salão</p>
                  {a.observacoes && <p className="mt-2 text-sm italic text-muted">“{a.observacoes}”</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {podeCancelar ? (
                      <FormAcao
                        action={cancelarAgendamento.bind(null, a.id)}
                        confirmar={`Cancelar ${a.servico} — ${formatarDataHora(a.inicio)}?`}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <Botao type="submit" variante="perigo" tamanho="pequeno">
                          Cancelar
                        </Botao>
                      </FormAcao>
                    ) : (
                      <p className="text-xs text-muted">Para alterações, fale com o salão.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {historico.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {a.servico} <span className="font-normal text-muted">com {a.profissional}</span>
                  </span>
                  <span className="block text-sm text-muted first-letter:uppercase">{formatarDataHora(a.inicio)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Selo tom={STATUS[a.status].tom}>{STATUS[a.status].rotulo}</Selo>
                  <Link
                    href={`/agendar?servico=${a.servicoId}&profissional=${a.profissionalId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Agendar de novo
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
