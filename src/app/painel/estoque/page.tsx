import { ArrowDownLeft, Coins, ArrowLeftRight, ArrowUpRight, Boxes, FlaskConical, PackagePlus, TriangleAlert, X } from "lucide-react";
import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { produtos, servicos, fichaTecnica, movimentacoesEstoque } from "@/db/schema";
import { ROTULOS, TelaGestao, Seletor, opcoesDe } from "@/components/gestao";
import { FormAcao } from "@/components/form-acao";
import { Botao, Campo, Indicador, Secao, Selecao, Selo, Tabela, Vazio } from "@/components/ui";
import { formatarPreco } from "@/lib/formato";
import { dataLocal, horaLocal } from "@/lib/fuso";
import { exigirSessao } from "@/lib/sessao";
import { criarProduto, movimentarEstoque, salvarFichaTecnica, removerItemFicha } from "../gestao-actions";

export const metadata: Metadata = { title: "Estoque" };

export default function Pagina() {
  return (
    <TelaGestao titulo="Estoque" descricao="Saldos, entradas e saídas de produtos e o consumo de cada serviço.">
      <Conteudo />
    </TelaGestao>
  );
}

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

function dataBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const [ps, ss, itens, movs] = await Promise.all([
    db.select().from(produtos).orderBy(asc(produtos.nome)),
    db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.nome)),
    db
      .select({
        servicoId: fichaTecnica.servicoId,
        produtoId: fichaTecnica.produtoId,
        quantidade: fichaTecnica.quantidade,
        servico: servicos.nome,
        produto: produtos.nome,
        unidade: produtos.unidade,
      })
      .from(fichaTecnica)
      .innerJoin(servicos, eq(servicos.id, fichaTecnica.servicoId))
      .innerJoin(produtos, eq(produtos.id, fichaTecnica.produtoId))
      .orderBy(asc(servicos.nome), asc(produtos.nome)),
    db
      .select({
        id: movimentacoesEstoque.id,
        produto: produtos.nome,
        unidade: produtos.unidade,
        tipo: movimentacoesEstoque.tipo,
        quantidade: movimentacoesEstoque.quantidade,
        observacao: movimentacoesEstoque.observacao,
        criadoEm: movimentacoesEstoque.createdAt,
      })
      .from(movimentacoesEstoque)
      .innerJoin(produtos, eq(produtos.id, movimentacoesEstoque.produtoId))
      .orderBy(desc(movimentacoesEstoque.createdAt))
      .limit(20),
  ]);

  const hoje = dataLocal(new Date());
  const baixos = ps.filter((p) => p.quantidadeAtual <= p.estoqueMinimo);
  const vencidos = ps.filter((p) => p.validade && p.validade < hoje);
  const valorTotal = ps.reduce((t, p) => t + Math.max(p.quantidadeAtual, 0) * p.custoUnitarioCentavos, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Indicador rotulo="Produtos cadastrados" valor={ps.length} icone={<Boxes />} />
        <Indicador
          rotulo="Abaixo do mínimo"
          valor={baixos.length}
          icone={<TriangleAlert />}
          tom={baixos.length ? "negativo" : "neutro"}
          detalhe={baixos.length ? baixos.map((p) => p.nome).slice(0, 3).join(", ") + (baixos.length > 3 ? "…" : "") : "Nenhum produto em falta"}
        />
        <Indicador
          rotulo="Valor em estoque"
          valor={formatarPreco(Math.round(valorTotal))}
          icone={<Coins />}
          detalhe={vencidos.length ? `${vencidos.length} produto(s) com validade vencida` : "Pelo custo de compra"}
          tom={vencidos.length ? "alerta" : "neutro"}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Secao className="xl:col-span-2" titulo="Produtos e saldos" semEspaco>
          {ps.length === 0 ? (
            <Vazio
              compacto
              icone={<Boxes />}
              titulo="Nenhum produto cadastrado"
              texto="Cadastre os produtos usados nos atendimentos ou vendidos no salão para controlar o saldo."
            />
          ) : (
            <Tabela rotulo="Produtos" colunas={["Produto", "Saldo", "Mínimo", "Validade", "Situação"]}>
              {ps.map((p) => {
                const baixo = p.quantidadeAtual <= p.estoqueMinimo;
                const vencido = p.validade && p.validade < hoje;
                return (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted">
                        {[p.marca, ROTULOS.tipoProduto[p.tipo]].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className={`font-medium tabular-nums ${baixo ? "text-danger" : ""}`}>
                      {numero.format(p.quantidadeAtual)} <span className="font-normal text-muted">{p.unidade}</span>
                    </td>
                    <td className="text-muted tabular-nums">
                      {numero.format(p.estoqueMinimo)} {p.unidade}
                    </td>
                    <td className={`tabular-nums ${vencido ? "font-medium text-danger" : "text-muted"}`}>{p.validade ? dataBr(p.validade) : "—"}</td>
                    <td>
                      {vencido ? (
                        <Selo tom="perigo" ponto>
                          Vencido
                        </Selo>
                      ) : baixo ? (
                        <Selo tom="alerta" ponto>
                          Repor
                        </Selo>
                      ) : (
                        <Selo tom="sucesso" ponto>
                          Ok
                        </Selo>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Tabela>
          )}
        </Secao>

        <Secao titulo="Movimentar estoque" icone={<ArrowLeftRight />} descricao="O saldo é atualizado na hora.">
          {ps.length === 0 ? (
            <p className="text-sm text-muted">Cadastre um produto para registrar entradas e saídas.</p>
          ) : (
            <FormAcao action={movimentarEstoque} limparAoConcluir className="grid gap-4">
              <Seletor id="mov-produto" nome="produtoId" rotulo="Produto" itens={ps} />
              <div className="grid grid-cols-2 gap-3">
                <Selecao
                  id="sentido"
                  rotulo="Tipo"
                  vazio={false}
                  opcoes={[
                    { valor: "entrada", rotulo: "Entrada" },
                    { valor: "saida", rotulo: "Saída" },
                  ]}
                />
                <Campo id="mov-quantidade" name="quantidade" rotulo="Quantidade" type="number" step="0.001" min="0.001" required />
              </div>
              <Campo id="observacao" rotulo="Motivo" placeholder="Ex.: compra, uso, perda" required />
              <Botao className="w-full">Registrar movimentação</Botao>
            </FormAcao>
          )}
        </Secao>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Secao
          className="xl:col-span-2"
          titulo="Ficha técnica"
          icone={<FlaskConical />}
          descricao="Quanto cada serviço consome. A baixa é automática ao concluir o atendimento."
          semEspaco
        >
          <FormAcao action={salvarFichaTecnica} className="grid items-end gap-3 px-5 pb-5 sm:grid-cols-[1fr_1fr_10rem_auto] sm:px-6">
            <Seletor id="ficha-servico" nome="servicoId" rotulo="Serviço" itens={ss} />
            <Seletor id="ficha-produto" nome="produtoId" rotulo="Produto" itens={ps} />
            <Campo id="consumo-quantidade" name="quantidade" rotulo="Consumo por serviço" type="number" min="0.001" step="0.001" required />
            <Botao variante="secundario">Salvar consumo</Botao>
          </FormAcao>
          {itens.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-center text-sm text-muted sm:px-6">Nenhum consumo cadastrado.</p>
          ) : (
            <Tabela rotulo="Ficha técnica" colunas={["Serviço", "Produto", "Consumo", <span key="a" className="sr-only">Ações</span>]}>
              {itens.map((i) => (
                <tr key={i.servicoId + i.produtoId}>
                  <td className="font-medium">{i.servico}</td>
                  <td>{i.produto}</td>
                  <td className="tabular-nums">
                    {numero.format(i.quantidade)} {i.unidade}
                  </td>
                  <td className="w-12 text-right">
                    <FormAcao action={removerItemFicha.bind(null, i.servicoId, i.produtoId)} silencioso>
                      <Botao variante="discreto" tamanho="icone" aria-label={`Remover ${i.produto} de ${i.servico}`}>
                        <X aria-hidden />
                      </Botao>
                    </FormAcao>
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Secao>

        <Secao titulo="Cadastrar produto" icone={<PackagePlus />}>
          <FormAcao action={criarProduto} className="grid gap-4" limparAoConcluir>
            <Campo id="nome" rotulo="Nome" placeholder="Ex.: Tinta 7.1" required />
            <Campo id="marca" rotulo="Marca" opcional />
            <div className="grid grid-cols-2 gap-3">
              <Selecao id="tipo" rotulo="Tipo" required opcoes={opcoesDe(ROTULOS.tipoProduto)} />
              <Selecao id="unidade" rotulo="Unidade" required opcoes={opcoesDe(ROTULOS.unidade)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="estoqueMinimo" rotulo="Estoque mínimo" type="number" step="0.001" min="0" defaultValue="0" />
              <Campo id="validade" rotulo="Validade" type="date" />
            </div>
            <Campo
              id="custoUnitarioCentavos"
              rotulo="Custo por unidade"
              type="number"
              step="0.0001"
              min="0"
              defaultValue="0"
              sufixo="¢"
              dica="Em centavos por ml, g ou unidade. Ex.: 35 = R$ 0,35."
            />
            <Botao className="w-full">Cadastrar produto</Botao>
          </FormAcao>
        </Secao>
      </div>

      <Secao titulo="Últimas movimentações" descricao="As 20 mais recentes" semEspaco>
        {movs.length === 0 ? (
          <p className="border-t border-border px-5 py-6 text-center text-sm text-muted sm:px-6">Nenhuma movimentação registrada.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {movs.map((m) => {
              const entrada = m.quantidade > 0;
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span
                    aria-hidden
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      entrada ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-surface text-muted"
                    }`}
                  >
                    {entrada ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.produto}</span>
                    <span className="block truncate text-xs text-muted">
                      {m.tipo === "consumo" ? "Consumo em atendimento" : m.observacao || "—"}
                    </span>
                  </span>
                  <span className={`text-sm font-medium tabular-nums ${entrada ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                    {entrada ? "+" : "−"}
                    {numero.format(Math.abs(m.quantidade))} {m.unidade}
                  </span>
                  <span className="hidden w-28 text-right text-xs text-muted tabular-nums sm:block">
                    {dataBr(dataLocal(m.criadoEm))} {horaLocal(m.criadoEm)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    </div>
  );
}
