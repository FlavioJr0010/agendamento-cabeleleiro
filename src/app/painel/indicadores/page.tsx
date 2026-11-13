import { Ban, CalendarCheck2, CircleDollarSign, Scale, Ticket, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TelaGestao } from "@/components/gestao";
import { BarraFiltros, Botao, Campo, Erro, Indicador, Secao, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { hojeNoSalao, dataValida, somarDias } from "@/lib/fuso";
import { formatarPreco } from "@/lib/formato";
import { dadosGestao } from "@/db/consultas/gestao";

export const metadata: Metadata = { title: "Indicadores" };

export default function Pagina({ searchParams }: PageProps<"/painel/indicadores">) {
  return (
    <TelaGestao titulo="Indicadores" descricao="Desempenho do salão no período escolhido.">
      <Conteudo searchParams={searchParams} />
    </TelaGestao>
  );
}

function ultimoDiaDoMes(anoMes: string) {
  const [a, m] = anoMes.split("-").map(Number);
  return `${anoMes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

function mesAnterior(anoMes: string) {
  const [a, m] = anoMes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Ranking com barras proporcionais. */
function Ranking({ itens, formatar }: { itens: { nome: string; valor: number; extra?: string }[]; formatar: (v: number) => string }) {
  const maior = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ol className="flex flex-col gap-4">
      {itens.map((i, pos) => (
        <li key={i.nome}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-muted tabular-nums">{pos + 1}.</span>
              <span className="font-medium">{i.nome}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{formatar(i.valor)}</span>
              {i.extra && <span className="ml-1.5 text-muted">{i.extra}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" style={{ width: `${(i.valor / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/indicadores">["searchParams"] }) {
  await exigirSessao(["dona"]);
  const sp = await searchParams;
  const hoje = hojeNoSalao();
  const inicio = typeof sp.inicio === "string" && dataValida(sp.inicio) ? sp.inicio : hoje.slice(0, 8) + "01";
  const fim = typeof sp.fim === "string" && dataValida(sp.fim) ? sp.fim : hoje;

  const mesAtual = hoje.slice(0, 7);
  const anterior = mesAnterior(mesAtual);
  const atalhos = [
    { rotulo: "Este mês", inicio: `${mesAtual}-01`, fim: hoje },
    { rotulo: "Mês passado", inicio: `${anterior}-01`, fim: ultimoDiaDoMes(anterior) },
    { rotulo: "Últimos 7 dias", inicio: somarDias(hoje, -6), fim: hoje },
    { rotulo: "Últimos 30 dias", inicio: somarDias(hoje, -29), fim: hoje },
  ];

  const filtros = (
    <BarraFiltros>
      <Campo id="inicio" rotulo="Início" type="date" defaultValue={inicio} />
      <Campo id="fim" rotulo="Fim" type="date" defaultValue={fim} />
      <Botao variante="secundario" tamanho="pequeno">
        Consultar
      </Botao>
      <nav aria-label="Períodos rápidos" className="flex flex-wrap gap-1.5 sm:ml-auto sm:self-end">
        {atalhos.map((a) => {
          const ativo = a.inicio === inicio && a.fim === fim;
          return (
            <Link
              key={a.rotulo}
              href={`/painel/indicadores?inicio=${a.inicio}&fim=${a.fim}`}
              aria-current={ativo ? "true" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                ativo ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </nav>
    </BarraFiltros>
  );

  if (fim < inicio) {
    return (
      <>
        {filtros}
        <Erro>
          A data final deve ser igual ou posterior à inicial.{" "}
          <Link href="/painel/indicadores" className="font-medium underline">
            Redefinir período
          </Link>
        </Erro>
      </>
    );
  }

  const r = await dadosGestao(inicio, fim);
  const concluidos = r.agenda.filter((a) => a.status === "concluido");
  const cancelados = r.agenda.filter((a) => a.status === "cancelado").length;
  const faltas = r.agenda.filter((a) => a.status === "faltou").length;
  const receitaServicos = r.caixa.filter((l) => l.categoria === "servico" && l.tipo === "entrada");
  const totalServicos = receitaServicos.reduce((s, l) => s + l.valorCentavos, 0);
  const encerrados = concluidos.length + faltas;
  const comparecimento = encerrados ? Math.round((concluidos.length / encerrados) * 100) : null;

  const porServico = new Map<string, { qtd: number; valor: number }>();
  const porProfissional = new Map<string, { qtd: number; valor: number }>();
  for (const a of concluidos) {
    for (const [mapa, chave] of [
      [porServico, a.servico],
      [porProfissional, a.profissional],
    ] as const) {
      const atual = mapa.get(chave) ?? { qtd: 0, valor: 0 };
      mapa.set(chave, { qtd: atual.qtd + 1, valor: atual.valor + a.precoCentavos });
    }
  }
  const pct = (n: number) => (r.agenda.length ? `${Math.round((n / r.agenda.length) * 100)}% dos agendamentos` : undefined);

  return (
    <div className="flex flex-col gap-6">
      {filtros}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <Indicador
          rotulo="Atendimentos concluídos"
          valor={concluidos.length}
          icone={<CalendarCheck2 />}
          detalhe={comparecimento !== null ? `Comparecimento de ${comparecimento}%` : "Nenhum atendimento encerrado"}
        />
        <Indicador rotulo="Receita de serviços" valor={formatarPreco(totalServicos)} icone={<CircleDollarSign />} tom="positivo" />
        <Indicador
          rotulo="Ticket médio de serviços"
          valor={formatarPreco(receitaServicos.length ? Math.round(totalServicos / receitaServicos.length) : 0)}
          icone={<Ticket />}
        />
        <Indicador rotulo="Cancelamentos" valor={cancelados} icone={<Ban />} tom={cancelados ? "alerta" : "neutro"} detalhe={pct(cancelados)} />
        <Indicador rotulo="Faltas" valor={faltas} icone={<UserX />} tom={faltas ? "negativo" : "neutro"} detalhe={pct(faltas)} />
        <Indicador
          rotulo="Saldo do caixa"
          valor={<span className={r.saldo < 0 ? "text-danger" : ""}>{formatarPreco(r.saldo)}</span>}
          icone={<Scale />}
          detalhe={`${formatarPreco(r.entradas)} de entradas · ${formatarPreco(r.saidas)} de saídas`}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Secao titulo="Serviços mais realizados" descricao="Atendimentos concluídos no período">
          {porServico.size === 0 ? (
            <Vazio compacto titulo="Sem atendimentos concluídos neste período." />
          ) : (
            <Ranking
              formatar={(v) => `${v}×`}
              itens={[...porServico]
                .sort((a, b) => b[1].qtd - a[1].qtd)
                .map(([nome, v]) => ({ nome, valor: v.qtd, extra: formatarPreco(v.valor) }))}
            />
          )}
        </Secao>
        <Secao titulo="Faturamento por profissional" descricao="Valor dos atendimentos concluídos">
          {porProfissional.size === 0 ? (
            <Vazio compacto titulo="Sem atendimentos concluídos neste período." />
          ) : (
            <Ranking
              formatar={formatarPreco}
              itens={[...porProfissional]
                .sort((a, b) => b[1].valor - a[1].valor)
                .map(([nome, v]) => ({ nome, valor: v.valor, extra: `· ${v.qtd} atend.` }))}
            />
          )}
        </Secao>
      </div>
    </div>
  );
}
