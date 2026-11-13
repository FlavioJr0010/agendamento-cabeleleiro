import { CalendarPlus, CircleCheck, Clock, MessageCircle, RotateCcw, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaCliente } from "@/components/site/area-cliente";
import { Botao, classeBotao, Esqueleto, Selo, Vazio } from "@/components/ui";
import { listarAgendamentosDaCliente } from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { dataLocal, formatarDataHora, formatarDiaLongo, horaLocal, partesDia } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { exigirSessao } from "@/lib/sessao";
import { cancelarAgendamento } from "./actions";

export const metadata: Metadata = { title: "Meus agendamentos" };

const STATUS = {
  pendente: { rotulo: "Aguardando confirmação", tom: "alerta" },
  confirmado: { rotulo: "Confirmado", tom: "sucesso" },
  em_atendimento: { rotulo: "Em atendimento", tom: "info" },
  concluido: { rotulo: "Concluído", tom: "neutro" },
  faltou: { rotulo: "Não compareceu", tom: "perigo" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" },
} as const;

export default function PaginaMeusAgendamentos({ searchParams }: PageProps<"/meus-agendamentos">) {
  return (
    <AreaCliente
      titulo="Meus agendamentos"
      descricao="Acompanhe, cancele ou repita seus horários."
      acoes={
        <Link href="/agendar" className={classeBotao()}>
          <CalendarPlus aria-hidden /> Novo agendamento
        </Link>
      }
    >
      <Suspense fallback={<Esqueleto linhas={3} />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </AreaCliente>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/meus-agendamentos">["searchParams"] }) {
  const { user } = await exigirSessao();
  const { novo } = await searchParams;
  const { proximos, historico } = await listarAgendamentosDaCliente(user.id);

  return (
    <div className="flex flex-col gap-10">
      {novo && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-300/70 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong className="font-semibold">Pedido de agendamento enviado!</strong> O salão vai confirmar em breve e você recebe um lembrete antes do
            horário.
          </p>
        </div>
      )}

      <section aria-labelledby="proximos">
        <h2 id="proximos" className="mb-4 text-lg font-semibold">
          Próximos
        </h2>
        {proximos.length === 0 ? (
          <Vazio
            icone={<CalendarPlus />}
            titulo="Você não tem horários marcados"
            texto="Escolha um serviço e garanta seu horário em menos de um minuto."
            acao={
              <Link href="/agendar" className={classeBotao()}>
                Agendar agora
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {proximos.map((a) => {
              const dia = dataLocal(a.inicio);
              const { semana, dia: numero, mes } = partesDia(dia);
              return (
                <li key={a.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
                  <div className="flex gap-4 p-5">
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-primary-soft py-2 text-primary">
                      <span className="text-[0.7rem] font-semibold tracking-wide uppercase">{semana.replace(".", "")}</span>
                      <span className="font-display text-3xl leading-none tabular-nums">{numero}</span>
                      <span className="text-[0.7rem] uppercase">{mes.replace(".", "")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-display text-xl leading-tight">{a.servico}</p>
                        <Selo tom={STATUS[a.status].tom} ponto>
                          {STATUS[a.status].rotulo}
                        </Selo>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                        <li className="flex items-center gap-2">
                          <Clock className="size-3.5 shrink-0" aria-hidden />
                          <span className="first-letter:uppercase">
                            {formatarDiaLongo(dia)}, às {horaLocal(a.inicio)} · {formatarDuracao(a.duracaoMin)}
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <UserRound className="size-3.5 shrink-0" aria-hidden /> com {a.profissional}
                        </li>
                      </ul>
                      {a.observacoes && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted italic">“{a.observacoes}”</p>}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/40 px-5 py-3">
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">{formatarPreco(a.precoCentavos)}</span>
                      <span className="text-muted"> · pago no salão</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/mensagens?agendamento=${a.id}`} className={classeBotao("discreto", "pequeno")}>
                        <MessageCircle aria-hidden /> Mensagem
                      </Link>
                      {a.podeCancelar ? (
                        <FormAcao
                          action={cancelarAgendamento.bind(null, a.id)}
                          confirmar={`Cancelar ${a.servico} — ${formatarDataHora(a.inicio)}?`}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Botao type="submit" variante="perigo" tamanho="pequeno">
                            Cancelar
                          </Botao>
                        </FormAcao>
                      ) : (
                        <span className="text-xs text-muted" title={`Cancelamento pelo site até ${REGRAS.prazoCancelamentoHoras}h antes`}>
                          Para alterar, fale com o salão
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section aria-labelledby="historico">
          <h2 id="historico" className="mb-4 text-lg font-semibold">
            Histórico
          </h2>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {historico.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {a.servico} <span className="font-normal text-muted">com {a.profissional}</span>
                  </span>
                  <span className="block text-sm text-muted first-letter:uppercase">{formatarDataHora(a.inicio)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Selo tom={STATUS[a.status].tom}>{STATUS[a.status].rotulo}</Selo>
                  <Link href={`/agendar?servico=${a.servicoId}&profissional=${a.profissionalId}`} className={classeBotao("secundario", "pequeno")}>
                    <RotateCcw aria-hidden /> Agendar de novo
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
