import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Botao, Campo, Esqueleto, Secao, Selo } from "@/components/ui";
import { obterProfissional } from "@/db/consultas/painel";
import { DIAS_SEMANA, formatarHora } from "@/lib/formato";
import { exigirSessao } from "@/lib/sessao";
import {
  adicionarFaixas,
  alternarAtivoProfissional,
  atualizarProfissional,
  definirServicos,
  desvincularLogin,
  removerFaixa,
  vincularLogin,
} from "../actions";

export const metadata: Metadata = { title: "Profissional" };

type Params = PageProps<"/painel/profissionais/[id]">["params"];

export default function PaginaProfissional({ params }: PageProps<"/painel/profissionais/[id]">) {
  return (
    <Suspense fallback={<Esqueleto linhas={6} />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Params }) {
  await exigirSessao(["dona"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const p = await obterProfissional(id);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/painel/profissionais" className="text-sm text-muted hover:text-foreground">
          ← Profissionais
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{p.nome}</h1>
          {!p.ativo && <Selo>Inativa</Selo>}
        </div>
      </div>

      {/* ── Serviços ── */}
      <Secao titulo="Serviços que realiza" descricao="Só estes serviços poderão ser agendados com ela.">
        {p.todosServicos.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum serviço cadastrado.{" "}
            <Link href="/painel/servicos" className="font-medium text-primary underline-offset-4 hover:underline">
              Cadastrar serviços
            </Link>
          </p>
        ) : (
          <FormAcao action={definirServicos.bind(null, p.id)} className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.todosServicos.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="servicos"
                    value={s.id}
                    defaultChecked={p.servicoIds.has(s.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="flex-1">{s.nome}</span>
                  {!s.ativo && <Selo>Inativo</Selo>}
                </label>
              ))}
            </div>
            <div>
              <Botao type="submit">Salvar serviços</Botao>
            </div>
          </FormAcao>
        )}
      </Secao>

      {/* ── Expediente ── */}
      <Secao
        titulo="Expediente semanal"
        descricao="Horários em que ela atende. Use mais de uma faixa por dia para pausas (ex.: 09:00–12:00 e 13:00–18:00)."
      >
        <ul className="flex flex-col divide-y divide-border">
          {DIAS_SEMANA.map((dia) => {
            const faixas = p.faixas.filter((f) => f.diaSemana === dia.valor);
            return (
              <li key={dia.valor} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                <span className="w-20 text-sm font-medium">{dia.nome}</span>
                {faixas.length === 0 ? (
                  <span className="text-sm text-muted">Folga</span>
                ) : (
                  <span className="flex flex-wrap gap-2">
                    {faixas.map((f) => (
                      <FormAcao
                        key={f.id}
                        action={removerFaixa.bind(null, p.id, f.id)}
                        silencioso
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-0.5 pr-0.5 pl-3 text-sm tabular-nums"
                      >
                        {formatarHora(f.inicio)}–{formatarHora(f.fim)}
                        <button
                          type="submit"
                          aria-label={`Remover ${formatarHora(f.inicio)}–${formatarHora(f.fim)} de ${dia.nome}`}
                          className="grid size-6 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          ×
                        </button>
                      </FormAcao>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <FormAcao
          action={adicionarFaixas.bind(null, p.id)}
          limparAoConcluir
          className="mt-4 flex flex-col gap-4 rounded-xl border border-dashed border-border p-4"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Adicionar faixa nos dias</legend>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <label
                  key={dia.valor}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-primary/40"
                >
                  <input type="checkbox" name="dias" value={dia.valor} className="sr-only" />
                  {dia.curto}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-end gap-3">
            <Campo rotulo="Início" id="inicio" type="time" step={900} required defaultValue="09:00" className="w-32" />
            <Campo rotulo="Fim" id="fim" type="time" step={900} required defaultValue="18:00" className="w-32" />
            <Botao type="submit" variante="secundario">
              Adicionar
            </Botao>
          </div>
        </FormAcao>
      </Secao>

      {/* ── Dados ── */}
      <Secao titulo="Dados">
        <FormAcao action={atualizarProfissional.bind(null, p.id)} className="flex flex-col gap-4">
          <Campo rotulo="Nome" id="nome" required maxLength={80} defaultValue={p.nome} />
          <AreaTexto rotulo="Apresentação (opcional)" id="bio" maxLength={500} defaultValue={p.bio ?? ""} />
          <div>
            <Botao type="submit">Salvar dados</Botao>
          </div>
        </FormAcao>
      </Secao>

      {/* ── Acesso ── */}
      <Secao
        titulo="Acesso ao sistema"
        descricao="Com acesso, ela entra com a própria conta para ver a agenda dela e responder conversas."
      >
        {p.emailLogin ? (
          <FormAcao
            action={desvincularLogin.bind(null, p.id)}
            confirmar={`Remover o acesso de ${p.emailLogin}?`}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm">
              Conta ligada: <strong>{p.emailLogin}</strong>
            </span>
            <Botao type="submit" variante="perigo" tamanho="pequeno">
              Remover acesso
            </Botao>
          </FormAcao>
        ) : (
          <FormAcao action={vincularLogin.bind(null, p.id)} limparAoConcluir className="flex flex-wrap items-end gap-3">
            <Campo
              rotulo="E-mail da conta dela"
              id="email"
              type="email"
              required
              placeholder="ana@exemplo.com"
              dica="Ela precisa ter criado uma conta no site antes."
              className="min-w-64 flex-1"
            />
            <Botao type="submit" variante="secundario" className="mb-5">
              Liberar acesso
            </Botao>
          </FormAcao>
        )}
      </Secao>

      {/* ── Ativar/desativar ── */}
      <Secao
        titulo={p.ativo ? "Desativar profissional" : "Reativar profissional"}
        descricao={
          p.ativo
            ? "Ela deixa de aparecer para agendamento. O histórico é mantido."
            : "Ela volta a aparecer para agendamento."
        }
      >
        <FormAcao
          action={alternarAtivoProfissional.bind(null, p.id)}
          confirmar={p.ativo ? `Desativar ${p.nome}?` : undefined}
          className="flex flex-col gap-2"
        >
          <div>
            <Botao type="submit" variante={p.ativo ? "perigo" : "secundario"}>
              {p.ativo ? "Desativar" : "Reativar"}
            </Botao>
          </div>
        </FormAcao>
      </Secao>
    </div>
  );
}
