import { CalendarDays, CalendarPlus, ClipboardList, History, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { user, fichasClientes, agendamentos, servicos, profissionais } from "@/db/schema";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Avatar, Botao, CabecalhoPagina, classeBotao, EsqueletoPainel, Indicador, Secao, Selo, Vazio } from "@/components/ui";
import { STATUS_AGENDAMENTO } from "@/lib/agenda-visual";
import { formatarPreco } from "@/lib/formato";
import { exigirSessao } from "@/lib/sessao";
import { dataLocal, horaLocal } from "@/lib/fuso";
import { salvarFicha } from "../../gestao-actions";

export const metadata: Metadata = { title: "Ficha da cliente" };

export default function Pagina({ params }: PageProps<"/painel/clientes/[id]">) {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

function dataCurta(d: Date) {
  const [a, m, dia] = dataLocal(d).split("-");
  return `${dia}/${m}/${a}`;
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao(["dona"]);
  const { id } = await params;
  const [c] = await db.select().from(user).where(eq(user.id, id));
  if (c?.papel !== "cliente") notFound();
  const [[f], historico] = await Promise.all([
    db.select().from(fichasClientes).where(eq(fichasClientes.clienteId, id)),
    db
      .select({
        id: agendamentos.id,
        inicio: agendamentos.inicio,
        status: agendamentos.status,
        precoCentavos: agendamentos.precoCentavos,
        servico: servicos.nome,
        profissional: profissionais.nome,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
      .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
      .where(eq(agendamentos.clienteId, id))
      .orderBy(desc(agendamentos.inicio)),
  ]);

  const concluidos = historico.filter((a) => a.status === "concluido");
  const gasto = concluidos.reduce((t, a) => t + a.precoCentavos, 0);
  const faltas = historico.filter((a) => a.status === "faltou").length;
  const temEmail = !c.email.endsWith("@clientes.local");

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/painel/clientes", rotulo: "Clientes" }}
        titulo={
          <span className="flex items-center gap-4">
            <Avatar nome={c.name} tamanho="grande" />
            {c.name}
          </span>
        }
        descricao={
          <span className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {c.telefone && (
              <a href={`tel:${c.telefone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-4" aria-hidden /> {c.telefone}
              </a>
            )}
            {temEmail && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="size-4" aria-hidden /> {c.email}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> Cliente desde {dataCurta(c.createdAt)}
            </span>
          </span>
        }
        acoes={
          <Link
            href={`/painel/agenda/novo?cliente=${c.id}`}
            className={classeBotao()}
          >
            <CalendarPlus aria-hidden /> Agendar para ela
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Indicador rotulo="Atendimentos concluídos" valor={concluidos.length} />
        <Indicador rotulo="Total gasto" valor={formatarPreco(gasto)} tom="positivo" />
        <Indicador rotulo="Faltas" valor={faltas} tom={faltas ? "negativo" : "neutro"} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-5">
        <Secao
          className="lg:col-span-3"
          icone={<ClipboardList />}
          titulo="Ficha de atendimento"
          descricao="Uso interno. Registre apenas o necessário para atender bem."
        >
          <FormAcao action={salvarFicha.bind(null, id)} className="grid gap-4">
            {(
              [
                ["preferencias", "Preferências", "Ex.: gosta de franja curta, prefere água morna"],
                ["formulaColoracao", "Fórmula de coloração", "Ex.: 7.1 + 20 vol, 35 min de pausa"],
                ["alergias", "Alergias e sensibilidades", "Ex.: sensível a amônia"],
                ["observacoes", "Observações", ""],
              ] as const
            ).map(([campo, rotulo, exemplo]) => (
              <AreaTexto key={campo} id={campo} rotulo={rotulo} placeholder={exemplo} maxLength={3000} defaultValue={f?.[campo] ?? ""} />
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted">
                {f?.updatedAt ? `Atualizada em ${dataCurta(f.updatedAt)}` : "Ficha ainda não preenchida"}
              </p>
              <Botao>Salvar ficha</Botao>
            </div>
          </FormAcao>
        </Secao>

        <Secao className="lg:col-span-2" icone={<History />} titulo="Histórico" descricao={`${historico.length} agendamento${historico.length === 1 ? "" : "s"}`} semEspaco>
          {historico.length === 0 ? (
            <Vazio compacto titulo="Sem agendamentos ainda" />
          ) : (
            <ol className="divide-y divide-border border-t border-border">
              {historico.map((a) => {
                const st = STATUS_AGENDAMENTO[a.status];
                return (
                  <li key={a.id}>
                    <Link href={`/painel/agenda/${a.id}`} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface/70 sm:px-6">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.servico}</span>
                        <span className="block text-xs text-muted tabular-nums">
                          {dataCurta(a.inicio)} às {horaLocal(a.inicio)} · {a.profissional}
                        </span>
                      </span>
                      <Selo tom={st.tom}>{st.rotulo}</Selo>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Secao>
      </div>
    </>
  );
}
