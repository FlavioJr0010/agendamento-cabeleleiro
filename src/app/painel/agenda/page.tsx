import { CalendarPlus, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { Botao, CabecalhoPagina, Campo, Esqueleto, Indicador, Selo, Vazio } from "@/components/ui";
import {
  faixasDoDia,
  listarAgendaPeriodo,
  profissionaisVisiveis,
  semanaDe,
} from "@/db/consultas/agenda-equipe";
import { janelaDoDia, minutoAgoraSe, minutosLocais, STATUS_AGENDAMENTO } from "@/lib/agenda-visual";
import { formatarPreco } from "@/lib/formato";
import {
  dataLocal,
  dataValida,
  formatarDiaLongo,
  hojeNoSalao,
  horaLocal,
  horaParaMinutos,
  minutosParaHora,
  partesDia,
  somarDias,
} from "@/lib/fuso";
import { exigirSessao } from "@/lib/sessao";
import { criarBloqueio, removerBloqueio } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

const PX_MIN = 1.4; // pixels por minuto na grade

export default function PaginaAgenda({ searchParams }: PageProps<"/painel/agenda">) {
  return (
    <Suspense fallback={<Esqueleto linhas={6} />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/agenda">["searchParams"] }) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const sp = await searchParams;
  const hoje = hojeNoSalao();
  const data = typeof sp.data === "string" && dataValida(sp.data) ? sp.data : hoje;
  const visao = sp.visao === "semana" ? "semana" : "dia";
  const profs = await profissionaisVisiveis({ id: user.id, papel: user.papel });

  if (profs.length === 0) {
    return (
      <>
        <CabecalhoPagina titulo="Agenda" />
        <Vazio
          titulo="Nenhuma agenda para mostrar"
          texto={
            user.papel === "dona"
              ? "Cadastre profissionais e o expediente delas para começar."
              : "Sua conta ainda não está ligada a uma profissional. Peça à administração para liberar seu acesso."
          }
          acao={
            user.papel === "dona" ? (
              <Link href="/painel/profissionais" className="font-medium text-primary hover:underline">
                Cadastrar profissionais
              </Link>
            ) : undefined
          }
        />
      </>
    );
  }

  const dias = visao === "dia" ? [data] : semanaDe(data);
  const { agendamentos, bloqueios, faixas } = await listarAgendaPeriodo(
    profs.map((p) => p.id),
    dias[0],
    somarDias(dias[dias.length - 1], 1),
  );
  const passo = visao === "dia" ? 1 : 7;
  const link = (d: string, v = visao) => `/painel/agenda?data=${d}&visao=${v}`;

  const doDia = agendamentos.filter((a) => dataLocal(a.inicio) === data);
  const ativos = doDia.filter((a) => a.status !== "faltou");
  const previsto = ativos.reduce((t, a) => t + a.precoCentavos, 0);

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao={<span className="first-letter:uppercase">{visao === "dia" ? formatarDiaLongo(data) : `Semana de ${formatarDiaLongo(dias[0])}`}</span>}
        acoes={
          <Link
            href={`/painel/agenda/novo?data=${data}`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            <CalendarPlus className="size-4" aria-hidden /> Novo agendamento
          </Link>
        }
      />

      {/* Barra de navegação */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-border bg-card p-1">
          <Link href={link(somarDias(data, -passo))} aria-label="Anterior" className="grid size-9 place-items-center rounded-full hover:bg-surface">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={link(hoje)} className="rounded-full px-4 py-1.5 text-sm font-medium hover:bg-surface">
            Hoje
          </Link>
          <Link href={link(somarDias(data, passo))} aria-label="Próximo" className="grid size-9 place-items-center rounded-full hover:bg-surface">
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <form action="/painel/agenda" className="flex items-center gap-2">
          <input type="hidden" name="visao" value={visao} />
          <label htmlFor="ir-data" className="sr-only">
            Ir para a data
          </label>
          <input id="ir-data" type="date" name="data" defaultValue={data} className="h-11 rounded-full border border-border bg-card px-4 text-sm" />
          <Botao type="submit" variante="secundario" tamanho="pequeno">
            Ir
          </Botao>
        </form>
        <div className="ml-auto flex rounded-full border border-border bg-card p-1 text-sm">
          {(["dia", "semana"] as const).map((v) => (
            <Link
              key={v}
              href={link(data, v)}
              aria-current={visao === v ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 font-medium capitalize ${visao === v ? "bg-primary text-primary-foreground" : "hover:bg-surface"}`}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {visao === "dia" && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Atendimentos" valor={ativos.length} />
          <Indicador rotulo="A confirmar" valor={doDia.filter((a) => a.status === "pendente").length} />
          <Indicador rotulo="Concluídos" valor={doDia.filter((a) => a.status === "concluido").length} />
          <Indicador rotulo="Previsto no dia" valor={formatarPreco(previsto)} />
        </div>
      )}

      {visao === "dia" ? (
        <GradeDia data={data} profs={profs} agendamentos={doDia} bloqueios={bloqueios} faixas={faixasDoDia(faixas, data)} />
      ) : (
        <Semana dias={dias} profs={profs} agendamentos={agendamentos} hoje={hoje} />
      )}

      {/* Bloquear horário */}
      <details className="group mt-8 rounded-3xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4 font-medium">
          <Lock className="size-4 text-muted" aria-hidden />
          Bloquear horário (folga, almoço, férias)
          <span className="ml-auto text-sm text-muted group-open:hidden">Abrir</span>
        </summary>
        <FormAcao action={criarBloqueio} className="grid gap-4 border-t border-border px-6 py-5 sm:grid-cols-6">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="bloq-prof" className="text-sm font-medium">
              Profissional
            </label>
            <select id="bloq-prof" name="profissionalId" className="h-11 rounded-xl border border-border bg-card px-3">
              {profs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <Campo rotulo="De" id="dataInicio" type="date" defaultValue={data} required className="sm:col-span-2" />
          <Campo rotulo="Até" id="dataFim" type="date" defaultValue={data} required className="sm:col-span-2" />
          <Campo rotulo="Das (opcional)" id="horaInicio" type="time" step={900} className="sm:col-span-2" dica="Vazio = dia inteiro" />
          <Campo rotulo="Às (opcional)" id="horaFim" type="time" step={900} className="sm:col-span-2" />
          <Campo rotulo="Motivo" id="motivo" maxLength={120} placeholder="Ex.: Férias" className="sm:col-span-2" />
          <div className="sm:col-span-6">
            <Botao type="submit" variante="secundario">
              Bloquear
            </Botao>
          </div>
        </FormAcao>
      </details>
    </>
  );
}

type Ag = Awaited<ReturnType<typeof listarAgendaPeriodo>>["agendamentos"][number];
type Bloq = Awaited<ReturnType<typeof listarAgendaPeriodo>>["bloqueios"][number];
type Faixa = Awaited<ReturnType<typeof listarAgendaPeriodo>>["faixas"][number];

function GradeDia({
  data,
  profs,
  agendamentos,
  bloqueios,
  faixas,
}: {
  data: string;
  profs: { id: string; nome: string }[];
  agendamentos: Ag[];
  bloqueios: Bloq[];
  faixas: Faixa[];
}) {
  const janela = janelaDoDia(faixas);
  const altura = (janela.fim - janela.inicio) * PX_MIN;
  const horas = Array.from({ length: (janela.fim - janela.inicio) / 60 + 1 }, (_, i) => janela.inicio + i * 60);
  const agora = minutoAgoraSe(data);
  const y = (min: number) => (Math.min(Math.max(min, janela.inicio), janela.fim) - janela.inicio) * PX_MIN;

  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card">
      <div className="flex min-w-fit">
        {/* Régua de horas */}
        <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-border bg-card">
          <div className="h-14 border-b border-border" />
          <div className="relative" style={{ height: altura }}>
            {horas.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-muted tabular-nums" style={{ top: y(h) }}>
                {minutosParaHora(h)}
              </span>
            ))}
          </div>
        </div>

        {profs.map((p) => {
          const faixasDela = faixas.filter((f) => f.profissionalId === p.id);
          return (
            <div key={p.id} className="min-w-[13rem] flex-1 border-r border-border last:border-r-0">
              <div className="sticky top-0 flex h-14 items-center gap-2 border-b border-border px-3">
                <span className="font-display grid size-8 place-items-center rounded-full bg-primary-soft text-sm text-primary">
                  {p.nome.charAt(0)}
                </span>
                <span className="truncate font-medium">{p.nome}</span>
              </div>
              <div
                className="relative bg-[repeating-linear-gradient(135deg,var(--surface)_0_6px,transparent_6px_12px)]"
                style={{ height: altura }}
              >
                {/* Expediente (área clara) */}
                {faixasDela.map((f) => (
                  <div
                    key={f.id}
                    className="absolute inset-x-0 bg-card"
                    style={{ top: y(horaParaMinutos(f.inicio)), height: y(horaParaMinutos(f.fim)) - y(horaParaMinutos(f.inicio)) }}
                  />
                ))}
                {/* Linhas das horas */}
                {horas.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: y(h) }} />
                ))}
                {/* Bloqueios */}
                {bloqueios
                  .filter((b) => b.profissionalId === p.id)
                  .map((b) => {
                    const ini = dataLocal(b.inicio) < data ? janela.inicio : minutosLocais(b.inicio);
                    const fim = dataLocal(b.fim) > data ? janela.fim : minutosLocais(b.fim);
                    return (
                      <div
                        key={b.id}
                        className="absolute inset-x-1 flex items-start justify-between gap-1 overflow-hidden rounded-lg border border-dashed border-zinc-400 bg-zinc-100/90 p-2 text-xs text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
                        style={{ top: y(ini), height: Math.max(y(fim) - y(ini), 22) }}
                      >
                        <span className="flex items-center gap-1 truncate">
                          <Lock className="size-3 shrink-0" aria-hidden /> {b.motivo ?? "Bloqueado"}
                        </span>
                        <FormAcao action={removerBloqueio.bind(null, b.id)} confirmar="Remover este bloqueio?" silencioso>
                          <button type="submit" aria-label="Remover bloqueio" className="rounded px-1 hover:bg-zinc-300/60">
                            ×
                          </button>
                        </FormAcao>
                      </div>
                    );
                  })}
                {/* Agendamentos */}
                {agendamentos
                  .filter((a) => a.profissionalId === p.id)
                  .map((a) => {
                    const ini = minutosLocais(a.inicio);
                    const st = STATUS_AGENDAMENTO[a.status];
                    const h = Math.max(a.duracaoMin * PX_MIN - 2, 26);
                    return (
                      <Link
                        key={a.id}
                        href={`/painel/agenda/${a.id}`}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-xs shadow-sm transition-shadow hover:shadow-md ${st.cor} ${a.status === "faltou" ? "line-through" : ""}`}
                        style={{ top: y(ini) + 1, height: h }}
                        title={`${horaLocal(a.inicio)} ${a.clienteNome} — ${a.servico} (${st.rotulo})`}
                      >
                        <span className="block truncate font-semibold">{a.clienteNome}</span>
                        <span className="block truncate text-muted">
                          {horaLocal(a.inicio)} · {a.servico}
                        </span>
                        {h > 56 && <span className="mt-1 inline-block text-[0.68rem] font-medium uppercase tracking-wide">{st.rotulo}</span>}
                      </Link>
                    );
                  })}
                {/* Agora */}
                {agora !== null && agora >= janela.inicio && agora <= janela.fim && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-primary" style={{ top: y(agora) }}>
                    <span className="absolute -top-1.5 -left-1 size-3 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Semana({ dias, profs, agendamentos, hoje }: { dias: string[]; profs: { id: string; nome: string }[]; agendamentos: Ag[]; hoje: string }) {
  const nome = new Map(profs.map((p) => [p.id, p.nome]));
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {dias.map((d) => {
        const lista = agendamentos.filter((a) => dataLocal(a.inicio) === d);
        const { semana, dia } = partesDia(d);
        return (
          <section key={d} className={`flex min-h-40 flex-col rounded-2xl border bg-card ${d === hoje ? "border-primary" : "border-border"}`}>
            <Link href={`/painel/agenda?data=${d}&visao=dia`} className="flex items-baseline justify-between border-b border-border px-3 py-2 hover:bg-surface">
              <span className="text-xs uppercase text-muted">{semana.replace(".", "")}</span>
              <span className={`text-lg font-semibold tabular-nums ${d === hoje ? "text-primary" : ""}`}>{dia}</span>
            </Link>
            <ul className="flex flex-col gap-1.5 p-2">
              {lista.length === 0 && <li className="px-1 py-2 text-xs text-muted">Livre</li>}
              {lista.map((a) => (
                <li key={a.id}>
                  <Link href={`/painel/agenda/${a.id}`} className={`block rounded-lg border-l-4 px-2 py-1.5 text-xs ${STATUS_AGENDAMENTO[a.status].cor}`}>
                    <span className="font-semibold tabular-nums">{horaLocal(a.inicio)}</span> {a.clienteNome.split(" ")[0]}
                    <span className="block truncate text-muted">
                      {a.servico}
                      {profs.length > 1 && ` · ${nome.get(a.profissionalId)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {lista.length > 0 && (
              <p className="mt-auto px-3 pb-2 text-xs text-muted">
                <Selo>{lista.length} atend.</Selo>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
