import { ArrowRight, Mail, UserPlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Avatar, Botao, CabecalhoPagina, Campo, EsqueletoPainel, Expansivel, Selo, Vazio } from "@/components/ui";
import { listarProfissionais } from "@/db/consultas/painel";
import { exigirSessao } from "@/lib/sessao";
import { criarProfissional } from "./actions";

export const metadata: Metadata = { title: "Profissionais" };

export default function PaginaProfissionais() {
  return (
    <>
      <CabecalhoPagina titulo="Profissionais" descricao="Equipe, serviços que cada uma realiza, expediente e acesso ao sistema." />
      <Suspense fallback={<EsqueletoPainel />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const lista = await listarProfissionais();

  return (
    <div className="flex flex-col gap-6">
      <Expansivel
        icone={<UserPlus />}
        titulo="Nova profissional"
        descricao="Na próxima tela você escolhe os serviços e o expediente."
        aberto={lista.length === 0}
      >
        <FormAcao action={criarProfissional} className="flex flex-col gap-4">
          <Campo rotulo="Nome" id="nome" required maxLength={80} placeholder="Ex.: Ana" />
          <AreaTexto
            rotulo="Apresentação"
            opcional
            id="bio"
            maxLength={500}
            placeholder="Especialidades, experiência…"
            dica="Aparece para as clientes no site."
          />
          <div className="flex justify-end border-t border-border pt-4">
            <Botao type="submit">Cadastrar e configurar</Botao>
          </div>
        </FormAcao>
      </Expansivel>

      {lista.length === 0 ? (
        <Vazio icone={<UsersRound />} titulo="Nenhuma profissional cadastrada" texto="Cadastre a equipe para liberar o agendamento online." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const pronta = p.qtdServicos > 0 && p.qtdFaixas > 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/painel/profissionais/${p.id}`}
                  className={`group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 ${
                    p.ativo ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar nome={p.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight">{p.nome}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{p.emailLogin ?? "Sem acesso ao sistema"}</span>
                      </p>
                    </div>
                    {!p.ativo ? (
                      <Selo>Inativa</Selo>
                    ) : pronta ? (
                      <Selo tom="sucesso" ponto>
                        Agendável
                      </Selo>
                    ) : (
                      <Selo tom="alerta" ponto>
                        Incompleta
                      </Selo>
                    )}
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Serviços</dt>
                      <dd className={`font-medium ${p.qtdServicos ? "" : "text-warning"}`}>{p.qtdServicos || "Nenhum"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Expediente</dt>
                      <dd className={`font-medium ${p.qtdFaixas ? "" : "text-warning"}`}>
                        {p.qtdFaixas ? `${p.qtdFaixas} faixa${p.qtdFaixas > 1 ? "s" : ""}` : "Não definido"}
                      </dd>
                    </div>
                  </dl>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Configurar <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
