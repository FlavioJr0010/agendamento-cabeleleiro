import { Bell, CalendarDays, Check, Clock, CreditCard, Moon, ShieldCheck, Sparkles, Sun, Sunset, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Avatar, Botao, classeBotao, Vazio } from "@/components/ui";
import { buscarDisponibilidade, listarProfissionaisDoServico, listarServicosDisponiveis } from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { imagemDoServico } from "@/lib/imagens";
import { dataValida, diaDaSemana, formatarDiaLongo, hojeNoSalao, horaLocal, partesDia, somarDias } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { obterSessao } from "@/lib/sessao";
import { confirmarAgendamento, entrarListaEspera } from "./actions";

export const metadata: Metadata = { title: "Agendar horário" };

type Selecao = {
  servico?: string;
  profissional?: string;
  data?: string;
  horario?: string;
};

function url(s: Selecao) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) if (v) p.set(k, v);
  const q = p.toString();
  return q ? `/agendar?${q}` : "/agendar";
}

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function PaginaAgendar({ searchParams }: PageProps<"/agendar">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Agendamento online</p>
      <h1 className="font-display mt-2 text-4xl tracking-tight sm:text-5xl">Agendar horário</h1>
      <p className="mt-2 max-w-xl text-muted">Escolha o serviço, a profissional e o melhor horário. Leva menos de um minuto.</p>
      <Suspense fallback={<EsqueletoFluxo />}>
        <Fluxo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function EsqueletoFluxo() {
  return (
    <div className="mt-8" aria-busy="true" aria-label="Carregando">
      <div className="h-10 max-w-xl animate-pulse rounded-full bg-surface" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}

type ItemResumo = { rotulo: string; valor: ReactNode; icone: ReactNode; alterar?: string };

async function Fluxo({ searchParams }: { searchParams: PageProps<"/agendar">["searchParams"] }) {
  const sp = await searchParams;
  const pedido: Selecao = {
    servico: texto(sp.servico),
    profissional: texto(sp.profissional),
    data: texto(sp.data),
    horario: texto(sp.horario),
  };

  // ── Etapa 1: serviço ──
  const servicos = await listarServicosDisponiveis();
  const servico = servicos.find((s) => s.id === pedido.servico);
  if (!servico) {
    return (
      <Moldura atual={1}>
        <Titulo descricao="Preço e duração aparecem antes de você decidir.">Qual serviço você quer fazer?</Titulo>
        {servicos.length === 0 ? (
          <Vazio titulo="Agendamento online indisponível" texto="Ainda não há serviços disponíveis para agendar pelo site. Fale com o salão." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {servicos.map((s) => (
              <li key={s.id}>
                <Opcao href={url({ servico: s.id })}>
                  <span className="flex gap-4">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                      <Image src={imagemDoServico(s)} alt="" fill sizes="80px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-display text-lg leading-tight">{s.nome}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                        <Clock className="size-3.5" aria-hidden /> {formatarDuracao(s.duracaoMin)}
                      </span>
                      {s.descricao && <span className="mt-1 line-clamp-2 block text-sm text-muted">{s.descricao}</span>}
                    </span>
                  </span>
                </Opcao>
              </li>
            ))}
          </ul>
        )}
      </Moldura>
    );
  }

  const itemServico: ItemResumo = {
    rotulo: "Serviço",
    valor: (
      <>
        {servico.nome}
        <span className="block text-xs font-normal text-muted">
          {formatarDuracao(servico.duracaoMin)} · {formatarPreco(servico.precoCentavos)}
        </span>
      </>
    ),
    icone: <Sparkles />,
    alterar: url({}),
  };

  // ── Etapa 2: profissional ──
  const profissionais = await listarProfissionaisDoServico(servico.id);
  const qualquer = pedido.profissional === "qualquer";
  const profissional = profissionais.find((p) => p.id === pedido.profissional);

  if (!qualquer && !profissional) {
    return (
      <Moldura atual={2} servico={servico} itens={[itemServico]}>
        <Titulo descricao="Tem uma profissional de confiança? Escolha. Se não, mostramos todos os horários livres.">Com quem?</Titulo>
        <ul className="grid gap-3 sm:grid-cols-2">
          {profissionais.length > 1 && (
            <li className="sm:col-span-2">
              <Opcao href={url({ servico: servico.id, profissional: "qualquer" })} destaque>
                <span className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-medium">Qualquer profissional</span>
                    <span className="block text-sm text-muted">Mais opções de horário — encaixamos com quem estiver livre.</span>
                  </span>
                </span>
              </Opcao>
            </li>
          )}
          {profissionais.map((p) => (
            <li key={p.id}>
              <Opcao href={url({ servico: servico.id, profissional: p.id })}>
                <span className="flex items-start gap-4">
                  <Avatar nome={p.nome} />
                  <span className="min-w-0">
                    <span className="font-display block text-lg leading-tight">{p.nome}</span>
                    {p.bio && <span className="mt-1 line-clamp-2 block text-sm text-muted">{p.bio}</span>}
                  </span>
                </span>
              </Opcao>
            </li>
          ))}
        </ul>
      </Moldura>
    );
  }

  const profParam = qualquer ? "qualquer" : profissional!.id;
  const itemProfissional: ItemResumo = {
    rotulo: "Profissional",
    valor: qualquer ? "Qualquer profissional" : profissional!.nome,
    icone: <UserRound />,
    alterar: url({ servico: servico.id }),
  };

  // ── Etapa 3: data e horário ──
  const hoje = hojeNoSalao();
  const diasQueAtende = new Set((qualquer ? profissionais : [profissional!]).flatMap((p) => [...p.dias]));
  const dias = Array.from({ length: REGRAS.janelaDias }, (_, i) => somarDias(hoje, i));
  const diasDisponiveis = dias.filter((d) => diasQueAtende.has(diaDaSemana(d)));
  const sessao = await obterSessao();
  const consultar = (d: string) =>
    buscarDisponibilidade({
      servicoId: servico.id,
      profissionalId: qualquer ? null : profissional!.id,
      data: d,
      clienteId: sessao?.user.id,
    });

  let data: string | undefined;
  let disp: Awaited<ReturnType<typeof consultar>> = null;
  if (pedido.data && dataValida(pedido.data) && diasDisponiveis.includes(pedido.data)) {
    data = pedido.data;
    disp = await consultar(data);
  } else {
    // Sem data escolhida: abre no primeiro dia que ainda tem horário livre.
    for (const d of diasDisponiveis.slice(0, 14)) {
      disp = await consultar(d);
      data = d;
      if (disp?.horarios.length) break;
    }
  }
  const horarios = disp?.horarios ?? [];
  const escolhido = horarios.find((h) => h.inicio.toISOString() === pedido.horario);

  // ── Etapa 4: confirmação ──
  if (escolhido && data) {
    const atribuida = profissionais.find((p) => p.id === escolhido.profissionais[0]);
    const voltar = url({ servico: servico.id, profissional: profParam, data, horario: pedido.horario });
    const trocarHorario = url({ servico: servico.id, profissional: profParam, data });
    const itens: ItemResumo[] = [
      itemServico,
      {
        ...itemProfissional,
        valor: (
          <>
            {atribuida?.nome}
            {qualquer && <span className="block text-xs font-normal text-muted">escolhida para encaixar melhor na agenda</span>}
          </>
        ),
      },
      {
        rotulo: "Quando",
        valor: (
          <>
            <span className="block first-letter:uppercase">{formatarDiaLongo(data)}</span>
            <span className="block text-xs font-normal text-muted">às {horaLocal(escolhido.inicio)}</span>
          </>
        ),
        icone: <CalendarDays />,
        alterar: trocarHorario,
      },
    ];

    return (
      <Moldura atual={4} servico={servico} itens={itens} semResumoMovel>
        <Titulo descricao="Revise os detalhes antes de confirmar.">Confira e confirme</Titulo>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-4 border-b border-border bg-primary-soft/50 p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-card text-center shadow-sm">
              <span className="font-display text-2xl leading-none tabular-nums">{partesDia(data).dia}</span>
            </span>
            <span>
              <span className="block font-display text-2xl tracking-tight tabular-nums">{horaLocal(escolhido.inicio)}</span>
              <span className="block text-sm text-muted first-letter:uppercase">{formatarDiaLongo(data)}</span>
            </span>
          </div>
          <dl className="divide-y divide-border">
            <Linha rotulo="Serviço" valor={servico.nome} />
            <Linha
              rotulo="Profissional"
              valor={
                <>
                  {atribuida?.nome}
                  {qualquer && <span className="block text-xs font-normal text-muted">escolhida para encaixar melhor na agenda</span>}
                </>
              }
            />
            <Linha rotulo="Duração" valor={formatarDuracao(servico.duracaoMin)} />
            <Linha rotulo="Valor" valor={<span className="text-lg font-semibold">{formatarPreco(servico.precoCentavos)}</span>} />
          </dl>
        </div>

        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <CreditCard className="size-4 shrink-0 text-accent" aria-hidden /> Pagamento feito no salão
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden /> Cancele pelo site até {REGRAS.prazoCancelamentoHoras}h antes
          </li>
        </ul>

        {sessao ? (
          <FormAcao action={confirmarAgendamento} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="servicoId" value={servico.id} />
            <input type="hidden" name="profissional" value={profParam} />
            <input type="hidden" name="inicio" value={escolhido.inicio.toISOString()} />
            <AreaTexto
              rotulo="Observações"
              opcional
              id="observacoes"
              maxLength={500}
              placeholder="Ex.: tenho alergia a amônia; quero só aparar as pontas…"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href={trocarHorario} className={classeBotao("discreto")}>
                Trocar horário
              </Link>
              <Botao type="submit" className="sm:min-w-56">
                <Check aria-hidden /> Confirmar agendamento
              </Botao>
            </div>
          </FormAcao>
        ) : (
          <div className="mt-6 rounded-2xl border border-primary/25 bg-primary-soft/40 p-5 sm:p-6">
            <p className="font-display text-xl">Falta só entrar na sua conta</p>
            <p className="mt-1 text-sm text-muted">Seu horário fica guardado: depois de entrar, você volta direto para esta tela.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/entrar?voltar=${encodeURIComponent(voltar)}`} className={classeBotao()}>
                Entrar e confirmar
              </Link>
              <Link href={`/cadastro?voltar=${encodeURIComponent(voltar)}`} className={classeBotao("secundario")}>
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </Moldura>
    );
  }

  const periodos = [
    { nome: "Manhã", icone: Sun, lista: horarios.filter((h) => horaLocal(h.inicio) < "12:00") },
    { nome: "Tarde", icone: Sunset, lista: horarios.filter((h) => horaLocal(h.inicio) >= "12:00" && horaLocal(h.inicio) < "18:00") },
    { nome: "Noite", icone: Moon, lista: horarios.filter((h) => horaLocal(h.inicio) >= "18:00") },
  ].filter((p) => p.lista.length > 0);

  return (
    <Moldura atual={3} servico={servico} itens={[itemServico, itemProfissional]}>
      <Titulo descricao="Só aparecem horários realmente livres.">Escolha o dia e o horário</Titulo>

      {diasDisponiveis.length === 0 ? (
        <Vazio icone={<CalendarDays />} titulo="Sem dias de atendimento nas próximas semanas" texto="Tente outra profissional ou fale com o salão." />
      ) : (
        <>
          <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:px-0" aria-label="Dias">
            {dias.map((d) => {
              const { semana, dia, mes } = partesDia(d);
              const atende = diasQueAtende.has(diaDaSemana(d));
              const ativo = d === data;
              const conteudo = (
                <>
                  <span className="text-[0.7rem] font-medium tracking-wide uppercase">{semana.replace(".", "")}</span>
                  <span className="font-display text-2xl leading-tight tabular-nums">{dia}</span>
                  <span className="text-[0.7rem]">{mes.replace(".", "")}</span>
                </>
              );
              const base = "flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 transition-colors";
              return (
                <li key={d}>
                  {atende ? (
                    <Link
                      href={url({ servico: servico.id, profissional: profParam, data: d })}
                      scroll={false}
                      aria-current={ativo ? "date" : undefined}
                      className={`${base} ${
                        ativo
                          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "border-border bg-card hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <span className={`${base} border-transparent text-muted/40`} aria-disabled="true" title="Sem atendimento">
                      {conteudo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-medium">
              Horários livres em <span className="first-letter:uppercase">{data && formatarDiaLongo(data)}</span>
            </h3>
            {periodos.length === 0 ? (
              <p className="mt-3 rounded-xl bg-surface p-4 text-sm text-muted">
                Nenhum horário livre neste dia. Tente outra data{!qualquer && " ou outra profissional"}.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                {periodos.map((p) => (
                  <div key={p.nome}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                      <p.icone className="size-3.5" aria-hidden /> {p.nome}
                    </h4>
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {p.lista.map((h) => (
                        <li key={h.inicio.toISOString()}>
                          <Link
                            href={url({ servico: servico.id, profissional: profParam, data, horario: h.inicio.toISOString() })}
                            className="block rounded-xl border border-border bg-card py-2.5 text-center text-sm font-medium tabular-nums transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                          >
                            {horaLocal(h.inicio)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data && (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-dashed border-border p-5 sm:flex-row sm:items-center">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Bell className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Não achou o horário ideal?</p>
                <p className="text-sm text-muted">Entre na lista de espera e avisamos se abrir vaga neste dia.</p>
              </div>
              {sessao ? (
                <FormAcao action={entrarListaEspera} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <input type="hidden" name="profissional" value={profParam} />
                  <input type="hidden" name="data" value={data} />
                  <label htmlFor="periodo" className="sr-only">
                    Período
                  </label>
                  <select
                    id="periodo"
                    name="periodo"
                    className="h-9 rounded-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="qualquer">Qualquer período</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                  <Botao variante="secundario" tamanho="pequeno">
                    Avise-me se abrir vaga
                  </Botao>
                </FormAcao>
              ) : (
                <Link
                  className={classeBotao("secundario", "pequeno")}
                  href={`/entrar?voltar=${encodeURIComponent(url({ servico: servico.id, profissional: profParam, data }))}`}
                >
                  Entrar para ser avisada
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </Moldura>
  );
}

// ─── Componentes de apresentação ─────────────────────────────────────────────

const ETAPAS = ["Serviço", "Profissional", "Horário", "Confirmar"];

/** Etapas + conteúdo + resumo lateral (desktop) ou compacto (celular). */
function Moldura({
  atual,
  servico,
  itens = [],
  semResumoMovel,
  children,
}: {
  atual: number;
  servico?: { nome: string; imagem: string | null };
  itens?: ItemResumo[];
  semResumoMovel?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Etapas atual={atual} />
      <div className={`mt-8 grid items-start gap-8 ${servico ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <div className="min-w-0">
          {itens.length > 0 && !semResumoMovel && (
            <ul className="mb-6 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card text-sm lg:hidden">
              {itens.map((i) => (
                <li key={i.rotulo} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">{i.rotulo}</span>
                    <span className="block font-medium">{i.valor}</span>
                  </span>
                  {i.alterar && (
                    <Link href={i.alterar} className="shrink-0 text-sm font-medium text-primary hover:underline">
                      Alterar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
        {servico && (
          <aside aria-label="Resumo do agendamento" className="sticky top-24 hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
            <div className="relative aspect-[16/9] bg-surface">
              <Image src={imagemDoServico(servico)} alt="" fill sizes="320px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <p className="absolute bottom-3 left-4 text-xs font-semibold tracking-[0.16em] text-ink-foreground/90 uppercase">Seu agendamento</p>
            </div>
            <ul className="divide-y divide-border">
              {itens.map((i) => (
                <li key={i.rotulo} className="flex items-start gap-3 px-4 py-3.5">
                  <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary [&>svg]:size-4">
                    {i.icone}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block text-xs text-muted">{i.rotulo}</span>
                    <span className="block font-medium">{i.valor}</span>
                  </span>
                  {i.alterar && (
                    <Link href={i.alterar} className="text-xs font-medium text-primary hover:underline">
                      Alterar
                    </Link>
                  )}
                </li>
              ))}
              {itens.length < 3 && (
                <li className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted">
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg border border-dashed border-border">
                    <CalendarDays className="size-4" />
                  </span>
                  {itens.length < 2 ? "Profissional e horário a seguir" : "Escolha o dia e o horário"}
                </li>
              )}
            </ul>
            <p className="flex items-center gap-2 border-t border-border bg-surface/60 px-4 py-3 text-xs text-muted">
              <CreditCard className="size-3.5 shrink-0" aria-hidden /> Pagamento no salão, sem taxa online.
            </p>
          </aside>
        )}
      </div>
    </>
  );
}

function Etapas({ atual }: { atual: number }) {
  return (
    <ol className="mt-8 flex items-center gap-2 sm:gap-3" aria-label={`Etapa ${atual} de ${ETAPAS.length}`}>
      {ETAPAS.map((nome, i) => {
        const n = i + 1;
        const feita = n < atual;
        const ativa = n === atual;
        return (
          <li key={nome} aria-current={ativa ? "step" : undefined} className="flex flex-1 items-center gap-2 sm:gap-3 last:flex-none">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
                feita
                  ? "bg-primary text-primary-foreground"
                  : ativa
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                    : "border border-border bg-card text-muted"
              }`}
            >
              {feita ? <Check className="size-3.5" aria-hidden /> : n}
            </span>
            <span className={`hidden text-sm whitespace-nowrap sm:inline ${ativa ? "font-semibold" : feita ? "text-foreground" : "text-muted"}`}>{nome}</span>
            {n < ETAPAS.length && <span aria-hidden className={`h-px flex-1 ${feita ? "bg-primary" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function Titulo({ children, descricao }: { children: ReactNode; descricao?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{children}</h2>
      {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3.5 text-sm">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

function Opcao({ href, children, destaque }: { href: string; children: ReactNode; destaque?: boolean }) {
  return (
    <Link
      href={href}
      className={`group block h-full rounded-2xl border p-4 transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 ${
        destaque ? "border-primary/30 bg-primary-soft/50" : "border-border bg-card"
      }`}
    >
      {children}
    </Link>
  );
}
