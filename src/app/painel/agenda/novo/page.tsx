import { Search, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Botao, CabecalhoPagina, Campo, Esqueleto, Secao } from "@/components/ui";
import { buscarDisponibilidade, listarServicosDisponiveis } from "@/db/consultas/agenda";
import { buscarClientes, obterCliente, profissionaisVisiveis } from "@/db/consultas/agenda-equipe";
import { db } from "@/db";
import { profissionalServicos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { dataValida, formatarDiaLongo, hojeNoSalao, horaLocal } from "@/lib/fuso";
import { exigirSessao } from "@/lib/sessao";
import { criarAgendamentoEquipe, criarClienteRapido } from "../actions";

export const metadata: Metadata = { title: "Novo agendamento" };

const txt = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default function PaginaNovoAgendamento({ searchParams }: PageProps<"/painel/agenda/novo">) {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo agendamento"
        descricao="Para clientes que ligam, mandam mensagem ou chegam ao balcão."
        voltar={{ href: "/painel/agenda", rotulo: "Agenda" }}
      />
      <Suspense fallback={<Esqueleto linhas={5} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel/agenda/novo">["searchParams"] }) {
  const { user } = await exigirSessao(["dona", "profissional"]);
  const sp = await searchParams;
  const q = txt(sp.q);
  const clienteId = txt(sp.cliente);
  const servicoId = txt(sp.servico);
  const profId = txt(sp.profissional);
  const data = dataValida(txt(sp.data)) && txt(sp.data) >= hojeNoSalao() ? txt(sp.data) : hojeNoSalao();

  const [cliente, resultados, servicosLista, profs] = await Promise.all([
    clienteId ? obterCliente(clienteId) : null,
    q ? buscarClientes(q) : [],
    listarServicosDisponiveis(),
    profissionaisVisiveis({ id: user.id, papel: user.papel }),
  ]);
  const params = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ cliente: clienteId, servico: servicoId, profissional: profId, data, ...extra });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/painel/agenda/novo?${p}`;
  };

  // Profissionais que fazem o serviço escolhido
  let profsDoServico = profs;
  if (servicoId) {
    const vinc = await db.select({ id: profissionalServicos.profissionalId }).from(profissionalServicos).where(eq(profissionalServicos.servicoId, servicoId));
    const ids = new Set(vinc.map((v) => v.id));
    profsDoServico = profs.filter((p) => ids.has(p.id));
  }
  const profEscolhida = profsDoServico.find((p) => p.id === profId);
  const disp =
    cliente && servicoId && profEscolhida
      ? await buscarDisponibilidade({ servicoId, profissionalId: profEscolhida.id, data, clienteId: cliente.id, antecedenciaMin: 0 })
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Cliente */}
      <Secao titulo="1. Cliente">
        {cliente ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4">
            <div>
              <p className="font-medium">{cliente.nome}</p>
              <p className="text-sm text-muted">{[cliente.telefone, cliente.email.endsWith("@clientes.local") ? null : cliente.email].filter(Boolean).join(" · ")}</p>
            </div>
            <Link href={params({ cliente: "" })} className="text-sm font-medium text-primary hover:underline">
              Trocar
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <form action="/painel/agenda/novo" className="flex gap-2">
                {servicoId && <input type="hidden" name="servico" value={servicoId} />}
                <input type="hidden" name="data" value={data} />
                <label htmlFor="q" className="sr-only">
                  Buscar cliente
                </label>
                <input id="q" name="q" defaultValue={q} placeholder="Nome, e-mail ou telefone" className="h-11 flex-1 rounded-xl border border-border bg-card px-3.5" />
                <Botao type="submit" variante="secundario">
                  <Search className="size-4" aria-hidden /> Buscar
                </Botao>
              </form>
              {q && (
                <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
                  {resultados.length === 0 && <li className="p-4 text-sm text-muted">Nenhuma cliente encontrada. Cadastre ao lado.</li>}
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <Link href={params({ cliente: c.id })} className="flex items-center justify-between gap-3 p-3 hover:bg-surface">
                        <span>
                          <span className="block font-medium">{c.nome}</span>
                          <span className="block text-xs text-muted">{c.telefone ?? c.email}</span>
                        </span>
                        <span className="text-sm font-medium text-primary">Selecionar</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <FormAcao action={criarClienteRapido} className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
              <p className="flex items-center gap-2 font-medium">
                <UserPlus className="size-4" aria-hidden /> Cliente nova
              </p>
              <input type="hidden" name="voltar" value="/painel/agenda/novo" />
              <Campo rotulo="Nome" id="nome" required />
              <Campo rotulo="WhatsApp / telefone" id="telefone" type="tel" required />
              <Campo rotulo="E-mail (opcional)" id="email" type="email" />
              <div>
                <Botao type="submit" variante="secundario">
                  Cadastrar e continuar
                </Botao>
              </div>
            </FormAcao>
          </div>
        )}
      </Secao>

      {/* 2. Serviço, profissional e data */}
      {cliente && (
        <Secao titulo="2. Serviço, profissional e dia">
          <form action="/painel/agenda/novo" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <input type="hidden" name="cliente" value={cliente.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="servico" className="text-sm font-medium">
                Serviço
              </label>
              <select id="servico" name="servico" defaultValue={servicoId} required className="h-11 rounded-xl border border-border bg-card px-3">
                <option value="" disabled>
                  Escolha…
                </option>
                {servicosLista.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} — {formatarDuracao(s.duracaoMin)} · {formatarPreco(s.precoCentavos)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profissional" className="text-sm font-medium">
                Profissional
              </label>
              <select id="profissional" name="profissional" defaultValue={profEscolhida?.id ?? ""} className="h-11 rounded-xl border border-border bg-card px-3">
                <option value="">Escolha…</option>
                {profsDoServico.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <Campo rotulo="Dia" id="data" type="date" min={hojeNoSalao()} defaultValue={data} required />
            <Botao type="submit" variante="secundario">
              Ver horários
            </Botao>
          </form>
          {servicoId && profsDoServico.length === 0 && (
            <p className="mt-3 text-sm text-danger">Nenhuma profissional da sua agenda faz este serviço.</p>
          )}
        </Secao>
      )}

      {/* 3. Horário */}
      {disp && (
        <Secao titulo={`3. Horário — ${formatarDiaLongo(data)}`}>
          {disp.horarios.length === 0 ? (
            <p className="text-muted">Nenhum horário livre neste dia para {profEscolhida?.nome}. Escolha outro dia.</p>
          ) : (
            <FormAcao action={criarAgendamentoEquipe} className="flex flex-col gap-4">
              <input type="hidden" name="clienteId" value={cliente!.id} />
              <input type="hidden" name="servicoId" value={servicoId} />
              <input type="hidden" name="profissional" value={profEscolhida!.id} />
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {disp.horarios.map((h) => (
                  <label key={h.inicio.toISOString()} className="cursor-pointer">
                    <input type="radio" name="inicio" value={h.inicio.toISOString()} required className="peer sr-only" />
                    <span className="block rounded-lg border border-border py-2 text-center text-sm font-medium tabular-nums peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                      {horaLocal(h.inicio)}
                    </span>
                  </label>
                ))}
              </div>
              <AreaTexto rotulo="Observações (opcional)" id="observacoes" maxLength={500} />
              <div>
                <Botao type="submit">Agendar e confirmar</Botao>
              </div>
            </FormAcao>
          )}
        </Secao>
      )}
    </div>
  );
}
