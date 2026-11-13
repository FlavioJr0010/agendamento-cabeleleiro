import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Avatar, Botao, Esqueleto } from "@/components/ui";
import {
  buscarDisponibilidade,
  listarProfissionaisDoServico,
  listarServicosDisponiveis,
} from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { dataValida, diaDaSemana, formatarDiaLongo, hojeNoSalao, horaLocal, partesDia, somarDias } from "@/lib/fuso";
import { REGRAS } from "@/lib/regras";
import { obterSessao } from "@/lib/sessao";
import { confirmarAgendamento } from "./actions";

export const metadata: Metadata = { title: "Agendar horário" };

type Selecao = { servico?: string; profissional?: string; data?: string; horario?: string };

function url(s: Selecao) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) if (v) p.set(k, v);
  const q = p.toString();
  return q ? `/agendar?${q}` : "/agendar";
}

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function PaginaAgendar({ searchParams }: PageProps<"/agendar">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agendar horário</h1>
      <Suspense fallback={<div className="mt-6"><Esqueleto linhas={4} /></div>}>
        <Fluxo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

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
      <>
        <Etapas atual={1} />
        <Titulo>Qual serviço você quer fazer?</Titulo>
        {servicos.length === 0 ? (
          <p className="text-muted">Ainda não há serviços disponíveis para agendamento online.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {servicos.map((s) => (
              <li key={s.id}>
                <Opcao href={url({ servico: s.id })}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{s.nome}</span>
                    <span className="font-semibold tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {formatarDuracao(s.duracaoMin)}
                    {s.descricao && ` · ${s.descricao}`}
                  </span>
                </Opcao>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  // ── Etapa 2: profissional ──
  const profissionais = await listarProfissionaisDoServico(servico.id);
  const qualquer = pedido.profissional === "qualquer";
  const profissional = profissionais.find((p) => p.id === pedido.profissional);
  const resumoServico = { rotulo: "Serviço", valor: servico.nome, alterar: url({}) };

  if (!qualquer && !profissional) {
    return (
      <>
        <Etapas atual={2} />
        <Resumo itens={[resumoServico]} />
        <Titulo>Com quem?</Titulo>
        <ul className="grid gap-3 sm:grid-cols-2">
          {profissionais.length > 1 && (
            <li className="sm:col-span-2">
              <Opcao href={url({ servico: servico.id, profissional: "qualquer" })} destaque>
                <span className="font-medium">Qualquer profissional</span>
                <span className="mt-1 block text-sm text-muted">Mostra mais opções de horário.</span>
              </Opcao>
            </li>
          )}
          {profissionais.map((p) => (
            <li key={p.id}>
              <Opcao href={url({ servico: servico.id, profissional: p.id })}>
                <span className="flex items-center gap-3">
                  <Avatar nome={p.nome} />
                  <span className="min-w-0">
                    <span className="block font-medium">{p.nome}</span>
                    {p.bio && <span className="block text-sm text-muted">{p.bio}</span>}
                  </span>
                </span>
              </Opcao>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const nomeProfissional = qualquer ? "Qualquer profissional" : profissional!.nome;
  const resumoProfissional = { rotulo: "Profissional", valor: nomeProfissional, alterar: url({ servico: servico.id }) };
  const profParam = qualquer ? "qualquer" : profissional!.id;

  // ── Etapa 3: data e horário ──
  const hoje = hojeNoSalao();
  const diasQueAtende = new Set(
    (qualquer ? profissionais : [profissional!]).flatMap((p) => [...p.dias]),
  );
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
    return (
      <>
        <Etapas atual={4} />
        <Titulo>Confira e confirme</Titulo>
        <div className="rounded-2xl border border-border bg-card p-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm sm:text-base">
            <dt className="text-muted">Serviço</dt>
            <dd className="font-medium">{servico.nome}</dd>
            <dt className="text-muted">Profissional</dt>
            <dd className="font-medium">
              {atribuida?.nome}
              {qualquer && <span className="block text-xs font-normal text-muted">escolhida para encaixar melhor na agenda</span>}
            </dd>
            <dt className="text-muted">Quando</dt>
            <dd className="font-medium">
              <span className="first-letter:uppercase">{formatarDiaLongo(data)}</span>, às {horaLocal(escolhido.inicio)}
            </dd>
            <dt className="text-muted">Duração</dt>
            <dd className="font-medium">{formatarDuracao(servico.duracaoMin)}</dd>
            <dt className="text-muted">Valor</dt>
            <dd className="font-semibold">{formatarPreco(servico.precoCentavos)}</dd>
          </dl>
        </div>

        <p className="mt-4 text-sm text-muted">
          O pagamento é feito no salão. Você pode cancelar pelo site até {REGRAS.prazoCancelamentoHoras}h antes do
          horário.
        </p>

        {sessao ? (
          <FormAcao action={confirmarAgendamento} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="servicoId" value={servico.id} />
            <input type="hidden" name="profissional" value={profParam} />
            <input type="hidden" name="inicio" value={escolhido.inicio.toISOString()} />
            <AreaTexto
              rotulo="Observações (opcional)"
              id="observacoes"
              maxLength={500}
              placeholder="Ex.: tenho alergia a amônia; quero só aparar as pontas…"
            />
            <div className="flex flex-wrap gap-3">
              <Botao type="submit">Confirmar agendamento</Botao>
              <Link
                href={url({ servico: servico.id, profissional: profParam, data })}
                className="inline-flex h-11 items-center rounded-lg px-4 font-medium text-muted hover:bg-border/40"
              >
                Trocar horário
              </Link>
            </div>
          </FormAcao>
        ) : (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="font-medium">Falta só entrar na sua conta para confirmar.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/entrar?voltar=${encodeURIComponent(voltar)}`}
                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:opacity-90"
              >
                Entrar e confirmar
              </Link>
              <Link
                href={`/cadastro?voltar=${encodeURIComponent(voltar)}`}
                className="inline-flex h-11 items-center rounded-lg border border-border px-5 font-medium hover:bg-border/40"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  const periodos = [
    { nome: "Manhã", lista: horarios.filter((h) => horaLocal(h.inicio) < "12:00") },
    { nome: "Tarde", lista: horarios.filter((h) => horaLocal(h.inicio) >= "12:00" && horaLocal(h.inicio) < "18:00") },
    { nome: "Noite", lista: horarios.filter((h) => horaLocal(h.inicio) >= "18:00") },
  ].filter((p) => p.lista.length > 0);

  return (
    <>
      <Etapas atual={3} />
      <Resumo itens={[resumoServico, resumoProfissional]} />
      <Titulo>Escolha o dia</Titulo>
      {diasDisponiveis.length === 0 ? (
        <p className="text-muted">Sem dias de atendimento nas próximas semanas.</p>
      ) : (
        <>
          <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Dias">
            {dias.map((d) => {
              const { semana, dia, mes } = partesDia(d);
              const atende = diasQueAtende.has(diaDaSemana(d));
              const ativo = d === data;
              const conteudo = (
                <>
                  <span className="text-xs uppercase">{semana.replace(".", "")}</span>
                  <span className="text-lg font-semibold tabular-nums">{dia}</span>
                  <span className="text-xs">{mes.replace(".", "")}</span>
                </>
              );
              const base = "flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border py-2";
              return (
                <li key={d}>
                  {atende ? (
                    <Link
                      href={url({ servico: servico.id, profissional: profParam, data: d })}
                      scroll={false}
                      aria-current={ativo ? "date" : undefined}
                      className={`${base} ${
                        ativo
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <span className={`${base} border-transparent text-muted/50`} aria-disabled="true">
                      {conteudo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <Titulo>
            Horários em <span className="first-letter:uppercase">{data && formatarDiaLongo(data)}</span>
          </Titulo>
          {periodos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-muted">
              Nenhum horário livre neste dia. Tente outra data{!qualquer && " ou outra profissional"}.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {periodos.map((p) => (
                <div key={p.nome}>
                  <h3 className="mb-2 text-sm font-medium text-muted">{p.nome}</h3>
                  <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {p.lista.map((h) => (
                      <li key={h.inicio.toISOString()}>
                        <Link
                          href={url({
                            servico: servico.id,
                            profissional: profParam,
                            data,
                            horario: h.inicio.toISOString(),
                          })}
                          className="block rounded-lg border border-border bg-card py-2.5 text-center font-medium tabular-nums hover:border-primary hover:text-primary"
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
        </>
      )}
    </>
  );
}

// ─── Componentes de apresentação ─────────────────────────────────────────────

const ETAPAS = ["Serviço", "Profissional", "Horário", "Confirmar"];

function Etapas({ atual }: { atual: number }) {
  return (
    <ol className="mt-4 mb-6 flex gap-1.5" aria-label={`Etapa ${atual} de ${ETAPAS.length}`}>
      {ETAPAS.map((nome, i) => (
        <li key={nome} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1 rounded-full ${i < atual ? "bg-primary" : "bg-border"}`} />
          <span className={`text-xs ${i + 1 === atual ? "font-semibold text-foreground" : "text-muted"}`}>{nome}</span>
        </li>
      ))}
    </ol>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-3 text-lg font-semibold">{children}</h2>;
}

function Resumo({ itens }: { itens: { rotulo: string; valor: string; alterar: string }[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card text-sm">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span>
            <span className="text-muted">{i.rotulo}: </span>
            <span className="font-medium">{i.valor}</span>
          </span>
          <Link href={i.alterar} className="font-medium text-primary hover:underline">
            Alterar
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Opcao({ href, children, destaque }: { href: string; children: ReactNode; destaque?: boolean }) {
  return (
    <Link
      href={href}
      className={`block h-full rounded-xl border p-4 transition-colors hover:border-primary ${
        destaque ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {children}
    </Link>
  );
}
