import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, HandCoins, Percent, Receipt, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { profissionais } from "@/db/schema";
import { ROTULOS, TelaGestao, opcoesDe } from "@/components/gestao";
import { FormAcao } from "@/components/form-acao";
import { Avatar, BarraFiltros, Botao, Campo, Indicador, Secao, Selecao, Selo, Tabela, Vazio, classeBotao } from "@/components/ui";
import { hojeNoSalao, dataValida, formatarDiaLongo, somarDias } from "@/lib/fuso";
import { formatarPreco } from "@/lib/formato";
import { dadosGestao } from "@/db/consultas/gestao";
import { exigirSessao } from "@/lib/sessao";
import { registrarLancamento, salvarComissao } from "../gestao-actions";

export const metadata: Metadata = { title: "Financeiro" };

export default function Pagina({ searchParams }: PageProps<"/painel/financeiro">) {
  return (
    <TelaGestao titulo="Financeiro" descricao="Caixa do dia, despesas e comissões da equipe.">
      <Conteudo searchParams={searchParams} />
    </TelaGestao>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/financeiro">["searchParams"] }) {
  await exigirSessao(["dona"]);
  const sp = await searchParams;
  const hoje = hojeNoSalao();
  const dia = typeof sp.data === "string" && dataValida(sp.data) ? sp.data : hoje;
  const [r, ps] = await Promise.all([dadosGestao(dia, dia), db.select().from(profissionais).orderBy(asc(profissionais.nome))]);
  const link = (d: string) => `/painel/financeiro?data=${d}`;

  return (
    <div className="flex flex-col gap-6">
      <BarraFiltros>
        <div className="flex items-center rounded-full border border-border bg-card p-1">
          <Link href={link(somarDias(dia, -1))} aria-label="Dia anterior" className="grid size-8 place-items-center rounded-full hover:bg-surface">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={link(hoje)} className="rounded-full px-3 py-1 text-sm font-medium hover:bg-surface">
            Hoje
          </Link>
          <Link href={link(somarDias(dia, 1))} aria-label="Próximo dia" className="grid size-8 place-items-center rounded-full hover:bg-surface">
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <label htmlFor="data" className="sr-only">
          Dia do caixa
        </label>
        <input
          id="data"
          name="data"
          type="date"
          defaultValue={dia}
          className="rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <Botao variante="secundario" tamanho="pequeno">
          Consultar
        </Botao>
        <p className="ml-auto self-center text-sm font-medium first-letter:uppercase">{formatarDiaLongo(dia)}</p>
      </BarraFiltros>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Indicador rotulo="Entradas" valor={formatarPreco(r.entradas)} icone={<ArrowDownLeft />} tom="positivo" />
        <Indicador rotulo="Saídas" valor={formatarPreco(r.saidas)} icone={<ArrowUpRight />} tom="negativo" />
        <Indicador
          rotulo="Saldo do caixa"
          valor={<span className={r.saldo < 0 ? "text-danger" : ""}>{formatarPreco(r.saldo)}</span>}
          icone={<Scale />}
        />
        <Indicador
          rotulo="Comissões geradas"
          valor={formatarPreco(r.comissoes)}
          icone={<HandCoins />}
          tom="alerta"
          detalhe="Saem do caixa só quando o pagamento é registrado como saída."
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Secao className="xl:col-span-2" titulo="Lançamentos do dia" descricao={`${r.caixa.length} lançamento${r.caixa.length === 1 ? "" : "s"}`} semEspaco>
          {r.caixa.length === 0 ? (
            <Vazio
              compacto
              icone={<Receipt />}
              titulo="Nenhum lançamento neste dia"
              texto="Atendimentos pagos entram aqui automaticamente. Despesas e outras entradas podem ser registradas ao lado."
            />
          ) : (
            <Tabela rotulo="Lançamentos" colunas={["Descrição", "Categoria", "Pagamento", <span key="v" className="block text-right">Valor</span>]}>
              {r.caixa.map((l) => {
                const entrada = l.tipo === "entrada";
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                            entrada ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                          }`}
                        >
                          {entrada ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <span className="font-medium">{l.descricao}</span>
                      </div>
                    </td>
                    <td>
                      <Selo tom={l.categoria === "despesa" ? "perigo" : l.categoria === "servico" ? "primario" : "neutro"}>{ROTULOS.categoria[l.categoria]}</Selo>
                    </td>
                    <td className="text-muted">{l.formaPagamento ? ROTULOS.formaPagamento[l.formaPagamento] : "—"}</td>
                    <td className={`text-right font-semibold whitespace-nowrap tabular-nums ${entrada ? "text-emerald-700 dark:text-emerald-400" : "text-danger"}`}>
                      {entrada ? "+ " : "− "}
                      {formatarPreco(l.valorCentavos)}
                    </td>
                  </tr>
                );
              })}
            </Tabela>
          )}
        </Secao>

        <Secao titulo="Novo lançamento" icone={<Receipt />} descricao="Despesas, vendas avulsas e ajustes.">
          <FormAcao action={registrarLancamento} limparAoConcluir className="grid gap-4">
            <Selecao id="tipo" rotulo="Tipo" required opcoes={[{ valor: "entrada", rotulo: "Entrada" }, { valor: "saida", rotulo: "Saída (despesa)" }]} />
            <Campo id="descricao" rotulo="Descrição" placeholder="Ex.: compra de luvas" required />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="valor" rotulo="Valor (R$)" placeholder="150,00" inputMode="decimal" required />
              <Campo id="lancamento-data" name="data" rotulo="Data" type="date" defaultValue={dia} required />
            </div>
            <Selecao id="formaPagamento" rotulo="Forma de pagamento" required opcoes={opcoesDe(ROTULOS.formaPagamento)} />
            <Botao className="w-full">Registrar lançamento</Botao>
          </FormAcao>
        </Secao>
      </div>

      <Secao
        titulo="Comissões por profissional"
        icone={<Percent />}
        descricao="O novo percentual vale para os próximos atendimentos; comissões já geradas não mudam."
        acoes={
          <Link href="/painel/profissionais" className={classeBotao("discreto", "pequeno")}>
            Gerenciar equipe
          </Link>
        }
        semEspaco
      >
        {ps.length === 0 ? (
          <p className="border-t border-border px-5 py-6 text-center text-sm text-muted sm:px-6">Nenhuma profissional cadastrada.</p>
        ) : (
          <Tabela rotulo="Comissões" colunas={["Profissional", "Gerada no dia", "Percentual"]}>
            {ps.map((p) => (
              <tr key={p.id} className={p.ativo ? "" : "opacity-60"}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar nome={p.nome} tamanho="pequeno" />
                    <span className="font-medium">{p.nome}</span>
                    {!p.ativo && <Selo>Inativa</Selo>}
                  </div>
                </td>
                <td className="font-medium tabular-nums">
                  {formatarPreco(r.caixa.filter((l) => l.profissionalId === p.id).reduce((s, l) => s + l.comissaoCentavos, 0))}
                </td>
                <td className="w-72">
                  <FormAcao action={salvarComissao.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`comissao-${p.id}`} className="sr-only">
                      Comissão de {p.nome} (%)
                    </label>
                    <div className="relative">
                      <input
                        id={`comissao-${p.id}`}
                        name="comissao"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        defaultValue={p.comissaoPercentual}
                        className="h-9 w-24 rounded-lg border border-border bg-card pr-7 pl-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2.5 grid place-items-center text-sm text-muted">
                        %
                      </span>
                    </div>
                    <Botao variante="secundario" tamanho="pequeno">
                      Salvar
                    </Botao>
                  </FormAcao>
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>
    </div>
  );
}
