import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CircleAlert,
  Clock,
  MessagesSquare,
  Scissors,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, CabecalhoPagina, classeBotao, EsqueletoPainel, Indicador, Secao, Selo, Vazio } from "@/components/ui";
import { dadosGestao } from "@/db/consultas/gestao";
import { contarNaoLidasEquipe } from "@/db/consultas/mensagens";
import { resumoPainel } from "@/db/consultas/painel";
import { STATUS_AGENDAMENTO } from "@/lib/agenda-visual";
import { formatarPreco } from "@/lib/formato";
import { formatarDiaLongo, hojeNoSalao, horaLocal } from "@/lib/fuso";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Painel" };

export default function PaginaPainel() {
  return (
    <Suspense
      fallback={
        <>
          <div className="mb-8 h-20 w-72 animate-pulse rounded-2xl bg-surface" />
          <EsqueletoPainel />
        </>
      }
    >
      <Resumo />
    </Suspense>
  );
}

function saudacao(hora: number) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

async function Resumo() {
  const { user } = await exigirSessao(["dona"]);
  const [r, dia, naoLidas] = await Promise.all([resumoPainel(), dadosGestao(), contarNaoLidasEquipe(user.id, "dona")]);

  // Uma linha por profissional, com todas as pendências dela.
  const porProfissional = new Map<string, { id: string; nome: string; faltas: string[] }>();
  for (const [lista, falta] of [
    [r.semServicos, "serviços"],
    [r.semExpediente, "expediente"],
  ] as const) {
    for (const p of lista) {
      const item = porProfissional.get(p.id) ?? { id: p.id, nome: p.nome, faltas: [] };
      item.faltas.push(falta);
      porProfissional.set(p.id, item);
    }
  }
  const pendencias = [...porProfissional.values()];

  const agora = new Date();
  const horaAgora = Number(horaLocal(agora).slice(0, 2));
  const ativos = dia.agenda.filter((a) => a.status !== "cancelado");
  const aConfirmar = ativos.filter((a) => a.status === "pendente").length;
  const previsto = ativos.filter((a) => a.status !== "faltou").reduce((t, a) => t + a.precoCentavos, 0);
  const proximo = ativos.find((a) => a.inicio > agora && (a.status === "pendente" || a.status === "confirmado"));

  return (
    <>
      <CabecalhoPagina
        titulo={`${saudacao(horaAgora)}, ${user.name.split(" ")[0]}`}
        descricao={<span className="first-letter:uppercase">{formatarDiaLongo(hojeNoSalao())}</span>}
        acoes={
          <Link href="/painel/agenda/novo" className={classeBotao()}>
            <CalendarPlus aria-hidden /> Novo agendamento
          </Link>
        }
      />

      {pendencias.length > 0 && (
        <section className="mb-6 flex gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 sm:p-5 dark:border-amber-800 dark:bg-amber-950/30">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">Falta configurar</h2>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
              Profissionais sem serviços ou sem expediente não aparecem para agendamento.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {pendencias.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/painel/profissionais/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 font-medium text-amber-900 ring-1 ring-amber-300/70 transition-colors hover:bg-white dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800"
                  >
                    {p.nome} · falta {p.faltas.join(" e ")}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Indicador rotulo="Atendimentos hoje" valor={ativos.length} icone={<CalendarCheck2 />} href="/painel/agenda" />
        <Indicador
          rotulo="A confirmar"
          valor={aConfirmar}
          icone={<CalendarClock />}
          tom={aConfirmar ? "alerta" : "neutro"}
          detalhe={aConfirmar ? "Confirme para avisar as clientes" : "Tudo confirmado"}
        />
        <Indicador
          rotulo="Entradas de hoje"
          valor={formatarPreco(dia.entradas)}
          icone={<Wallet />}
          tom="positivo"
          detalhe={`Previsto na agenda: ${formatarPreco(previsto)}`}
          href="/painel/financeiro"
        />
        <Indicador
          rotulo="Mensagens não lidas"
          valor={naoLidas}
          icone={<MessagesSquare />}
          tom={naoLidas ? "alerta" : "neutro"}
          href="/painel/mensagens"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Secao
          className="lg:col-span-2"
          titulo="Agenda de hoje"
          descricao={ativos.length ? `${ativos.length} atendimento${ativos.length > 1 ? "s" : ""} marcado${ativos.length > 1 ? "s" : ""}` : undefined}
          acoes={
            <Link href="/painel/agenda" className={classeBotao("secundario", "pequeno")}>
              Abrir agenda
            </Link>
          }
          semEspaco
        >
          {dia.agenda.length === 0 ? (
            <Vazio
              compacto
              icone={<CalendarCheck2 />}
              titulo="Nenhum atendimento hoje"
              texto="Quando as clientes agendarem pelo site ou você marcar pelo balcão, eles aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {dia.agenda.map((a) => {
                const st = STATUS_AGENDAMENTO[a.status];
                const passado = a.inicio < agora;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/painel/agenda/${a.id}`}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors sm:gap-4 hover:bg-surface/70 sm:px-6 ${
                        a.status === "cancelado" ? "opacity-55" : ""
                      }`}
                    >
                      <span className={`w-12 shrink-0 text-sm font-semibold tabular-nums ${passado ? "text-muted" : ""}`}>
                        {horaLocal(a.inicio)}
                      </span>
                      <span className="hidden sm:block">
                        <Avatar nome={a.cliente} tamanho="pequeno" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a.cliente}</span>
                        <span className="block truncate text-sm text-muted">
                          {a.servico} · {a.profissional}
                        </span>
                      </span>
                      <span className="hidden text-sm font-medium tabular-nums sm:block">{formatarPreco(a.precoCentavos)}</span>
                      <Selo tom={st.tom} ponto>
                        {st.rotulo}
                      </Selo>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <div className="flex flex-col gap-6">
          <Secao titulo="Próximo atendimento" icone={<Clock />}>
            {proximo ? (
              <Link href={`/painel/agenda/${proximo.id}`} className="group block">
                <p className="font-display text-3xl tracking-tight tabular-nums">{horaLocal(proximo.inicio)}</p>
                <p className="mt-1 font-medium">{proximo.cliente}</p>
                <p className="text-sm text-muted">
                  {proximo.servico} com {proximo.profissional}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Ver detalhes <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted">Nenhum outro atendimento previsto para hoje.</p>
            )}
          </Secao>

          <Secao titulo="Atalhos">
            <ul className="-mx-2 -my-1 flex flex-col">
              {[
                { href: "/painel/servicos", icone: Scissors, rotulo: "Serviços ativos", valor: r.servicosAtivos },
                { href: "/painel/profissionais", icone: UsersRound, rotulo: "Profissionais ativas", valor: r.profissionaisAtivas },
                { href: "/painel/financeiro", icone: Wallet, rotulo: "Caixa do dia", valor: formatarPreco(dia.saldo) },
              ].map(({ href, icone: Icone, rotulo, valor }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface">
                    <span className="grid size-8 place-items-center rounded-lg bg-surface text-muted transition-colors group-hover:bg-card group-hover:text-primary">
                      <Icone className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm">{rotulo}</span>
                    <span className="text-sm font-semibold tabular-nums">{valor}</span>
                    <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Secao>
        </div>
      </div>
    </>
  );
}
