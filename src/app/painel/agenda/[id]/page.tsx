import { CalendarClock, CheckCircle2, Mail, MessageCircle, MessagesSquare, Phone, Play, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { z } from "zod";
import { FormAcao } from "@/components/form-acao";
import { Botao, CabecalhoPagina, Campo, Esqueleto, Secao, Selo } from "@/components/ui";
import { buscarDisponibilidade } from "@/db/consultas/agenda";
import { obterAgendamentoEquipe, profissionaisVisiveis } from "@/db/consultas/agenda-equipe";
import { STATUS_AGENDAMENTO } from "@/lib/agenda-visual";
import { formatarDuracao, formatarPreco, precoParaCampo } from "@/lib/formato";
import { dataLocal, dataValida, formatarDataHora, hojeNoSalao, horaLocal, partesDia, somarDias } from "@/lib/fuso";
import { linkWhatsapp } from "@/lib/salao";
import { exigirSessao } from "@/lib/sessao";
import {
  cancelarPeloSalao,
  concluirAtendimento,
  confirmarAgendamentoEquipe,
  iniciarAtendimento,
  marcarFalta,
  remarcarAgendamento,
} from "../actions";

export const metadata: Metadata = { title: "Agendamento" };

const FORMAS = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "credito", rotulo: "Cartão de crédito" },
  { valor: "debito", rotulo: "Cartão de débito" },
  { valor: "outro", rotulo: "Outro" },
];

export default function PaginaAgendamento({ params, searchParams }: PageProps<"/painel/agenda/[id]">) {
  return (
    <Suspense fallback={<Esqueleto linhas={6} />}>
      <Conteudo params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({
  params,
  searchParams,
}: {
  params: PageProps<"/painel/agenda/[id]">["params"];
  searchParams: PageProps<"/painel/agenda/[id]">["searchParams"];
}) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const a = await obterAgendamentoEquipe({ id: user.id, papel: user.papel }, id);
  if (!a) notFound();

  const st = STATUS_AGENDAMENTO[a.status];
  const aberto = a.status === "pendente" || a.status === "confirmado";
  const podeConcluir = aberto || a.status === "em_atendimento";
  const whatsapp = linkWhatsapp(a.clienteTelefone, `Olá, ${a.clienteNome.split(" ")[0]}! Aqui é do salão, sobre seu horário de ${formatarDataHora(a.inicio)}.`);
  const emailReal = !a.clienteEmail.endsWith("@clientes.local");

  return (
    <>
      <CabecalhoPagina
        titulo={a.servico}
        descricao={<span className="first-letter:uppercase">{formatarDataHora(a.inicio)}</span>}
        voltar={{ href: `/painel/agenda?data=${dataLocal(a.inicio)}`, rotulo: "Agenda" }}
        acoes={<Selo tom={st.tom}>{st.rotulo}</Selo>}
      />

      {sp.criado && (
        <p role="status" className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Agendamento criado e confirmado. A cliente foi avisada.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {/* Ações principais */}
          {(aberto || a.status === "em_atendimento") && (
            <Secao titulo="Ações">
              <div className="flex flex-wrap gap-2">
                {a.status === "pendente" && (
                  <FormAcao action={confirmarAgendamentoEquipe.bind(null, a.id)}>
                    <Botao type="submit">
                      <CheckCircle2 className="size-4" aria-hidden /> Confirmar
                    </Botao>
                  </FormAcao>
                )}
                {aberto && (
                  <FormAcao action={iniciarAtendimento.bind(null, a.id)}>
                    <Botao type="submit" variante="secundario">
                      <Play className="size-4" aria-hidden /> Iniciar atendimento
                    </Botao>
                  </FormAcao>
                )}
                {aberto && (
                  <FormAcao action={marcarFalta.bind(null, a.id)} confirmar="Registrar que a cliente não compareceu?">
                    <Botao type="submit" variante="discreto">
                      <UserX className="size-4" aria-hidden /> Não compareceu
                    </Botao>
                  </FormAcao>
                )}
              </div>
            </Secao>
          )}

          {podeConcluir && (
            <Secao titulo="Concluir e receber" descricao="Registra o pagamento no caixa, calcula a comissão e dá baixa nos produtos da ficha técnica.">
              <FormAcao action={concluirAtendimento.bind(null, a.id)} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forma" className="text-sm font-medium">
                    Forma de pagamento
                  </label>
                  <select id="forma" name="forma" required defaultValue="pix" className="h-11 rounded-xl border border-border bg-card px-3">
                    {FORMAS.map((f) => (
                      <option key={f.valor} value={f.valor}>
                        {f.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <Campo rotulo="Valor (R$)" id="valor" inputMode="decimal" required defaultValue={precoParaCampo(a.precoCentavos)} />
                <Botao type="submit">Concluir</Botao>
              </FormAcao>
            </Secao>
          )}

          {aberto && (
            <Remarcar
              agendamento={a}
              data={typeof sp.remarcar === "string" && dataValida(sp.remarcar) ? sp.remarcar : null}
              profissional={typeof sp.prof === "string" ? sp.prof : a.profissionalId}
              usuario={{ id: user.id, papel: user.papel }}
            />
          )}

          {a.pagamento && (
            <Secao titulo="Pagamento">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Dado rotulo="Valor recebido">{formatarPreco(a.pagamento.valorCentavos)}</Dado>
                <Dado rotulo="Forma">{FORMAS.find((f) => f.valor === a.pagamento?.formaPagamento)?.rotulo ?? "—"}</Dado>
                <Dado rotulo="Comissão">{formatarPreco(a.pagamento.comissaoCentavos)}</Dado>
              </dl>
            </Secao>
          )}

          {aberto && (
            <Secao titulo="Cancelar agendamento" descricao="A cliente recebe uma mensagem com o motivo e o horário é liberado.">
              <FormAcao action={cancelarPeloSalao.bind(null, a.id)} confirmar="Cancelar este agendamento?" className="flex flex-wrap items-end gap-3">
                <Campo rotulo="Motivo (opcional)" id="motivo" maxLength={300} placeholder="Ex.: profissional indisponível" className="min-w-64 flex-1" />
                <Botao type="submit" variante="perigo">
                  Cancelar agendamento
                </Botao>
              </FormAcao>
            </Secao>
          )}
        </div>

        {/* Lateral: detalhes e cliente */}
        <aside className="flex flex-col gap-6">
          <Secao titulo="Detalhes">
            <dl className="flex flex-col gap-3 text-sm">
              <Dado rotulo="Profissional">{a.profissional}</Dado>
              <Dado rotulo="Duração">{formatarDuracao(a.duracaoMin)}</Dado>
              <Dado rotulo="Valor">{formatarPreco(a.precoCentavos)}</Dado>
              {a.observacoes && <Dado rotulo="Observações da cliente">“{a.observacoes}”</Dado>}
              {a.motivoCancelamento && <Dado rotulo="Motivo do cancelamento">{a.motivoCancelamento}</Dado>}
            </dl>
          </Secao>
          <Secao titulo="Cliente">
            <p className="font-display text-xl">{a.clienteNome}</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp {a.clienteTelefone}
                </a>
              )}
              {a.clienteTelefone && (
                <a href={`tel:${a.clienteTelefone.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 hover:underline">
                  <Phone className="size-4" aria-hidden /> Ligar
                </a>
              )}
              {emailReal && (
                <a href={`mailto:${a.clienteEmail}`} className="inline-flex items-center gap-2 hover:underline">
                  <Mail className="size-4" aria-hidden /> {a.clienteEmail}
                </a>
              )}
              {a.conversaId && (
                <Link href={`/painel/mensagens/${a.conversaId}`} className="inline-flex items-center gap-2 hover:underline">
                  <MessagesSquare className="size-4" aria-hidden /> Ver conversa
                </Link>
              )}
              {user.papel === "dona" && (
                <Link href={`/painel/clientes/${a.clienteId}`} className="mt-2 font-medium text-primary hover:underline">
                  Abrir ficha da cliente →
                </Link>
              )}
            </div>
          </Secao>
        </aside>
      </div>
    </>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{rotulo}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

async function Remarcar({
  agendamento: a,
  data,
  profissional,
  usuario,
}: {
  agendamento: NonNullable<Awaited<ReturnType<typeof obterAgendamentoEquipe>>>;
  data: string | null;
  profissional: string;
  usuario: { id: string; papel?: string | null };
}) {
  const hoje = hojeNoSalao();
  const dias = Array.from({ length: 21 }, (_, i) => somarDias(hoje, i));
  const profs = await profissionaisVisiveis(usuario);
  const profAtual = profs.find((p) => p.id === profissional)?.id ?? a.profissionalId;
  const disp = data
    ? await buscarDisponibilidade({
        servicoId: a.servicoId,
        profissionalId: profAtual,
        data,
        clienteId: a.clienteId,
        ignorarAgendamentoId: a.id,
        antecedenciaMin: 0,
      })
    : null;
  const base = `/painel/agenda/${a.id}?prof=${profAtual}`;

  return (
    <Secao titulo="Remarcar" descricao="Escolha o dia e um horário livre. A cliente é avisada automaticamente.">
      <div className="flex flex-col gap-4">
        {profs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {profs.map((p) => (
              <Link
                key={p.id}
                href={`/painel/agenda/${a.id}?prof=${p.id}${data ? `&remarcar=${data}` : ""}`}
                scroll={false}
                className={`rounded-full border px-3 py-1.5 text-sm ${p.id === profAtual ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface"}`}
              >
                {p.nome}
              </Link>
            ))}
          </div>
        )}
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Dias">
          {dias.map((d) => {
            const { semana, dia } = partesDia(d);
            return (
              <li key={d}>
                <Link
                  href={`${base}&remarcar=${d}`}
                  scroll={false}
                  aria-current={d === data ? "date" : undefined}
                  className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-xs ${d === data ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
                >
                  <span className="uppercase">{semana.replace(".", "")}</span>
                  <span className="text-base font-semibold tabular-nums">{dia}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {data && (
          <FormAcao action={remarcarAgendamento.bind(null, a.id)} className="flex flex-col gap-3">
            <input type="hidden" name="profissional" value={profAtual} />
            {disp && disp.horarios.length > 0 ? (
              <fieldset>
                <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <CalendarClock className="size-4" aria-hidden /> Horários livres
                </legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {disp.horarios.map((h) => (
                    <label key={h.inicio.toISOString()} className="cursor-pointer">
                      <input type="radio" name="inicio" value={h.inicio.toISOString()} required className="peer sr-only" />
                      <span className="block rounded-lg border border-border py-2 text-center text-sm font-medium tabular-nums peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                        {horaLocal(h.inicio)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-muted">Nenhum horário livre neste dia.</p>
            )}
            {disp && disp.horarios.length > 0 && (
              <div>
                <Botao type="submit" variante="secundario">
                  Remarcar
                </Botao>
              </div>
            )}
          </FormAcao>
        )}
      </div>
    </Secao>
  );
}
