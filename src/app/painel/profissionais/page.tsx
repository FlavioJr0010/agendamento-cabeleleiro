import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { AreaTexto, Botao, Campo, Esqueleto, Secao, Selo } from "@/components/ui";
import { listarProfissionais } from "@/db/consultas/painel";
import { exigirSessao } from "@/lib/sessao";
import { criarProfissional } from "./actions";

export const metadata: Metadata = { title: "Profissionais" };

export default function PaginaProfissionais() {
  return (
    <Suspense fallback={<Esqueleto linhas={5} />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const lista = await listarProfissionais();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profissionais</h1>

      <Secao titulo="Nova profissional" descricao="Na próxima tela você escolhe os serviços e o expediente.">
        <FormAcao action={criarProfissional} className="flex flex-col gap-4">
          <Campo rotulo="Nome" id="nome" required maxLength={80} placeholder="Ex.: Ana" />
          <AreaTexto
            rotulo="Apresentação (opcional)"
            id="bio"
            maxLength={500}
            placeholder="Especialidades, experiência… aparece para as clientes."
          />
          <div>
            <Botao type="submit">Cadastrar e configurar</Botao>
          </div>
        </FormAcao>
      </Secao>

      <Secao titulo={`Equipe (${lista.length})`}>
        {lista.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma profissional cadastrada ainda.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {lista.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/painel/profissionais/${p.id}`}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-border/40 ${
                    p.ativo ? "" : "opacity-60"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{p.nome}</span>
                    <span className="truncate text-xs text-muted">{p.emailLogin ?? "Sem acesso ao sistema"}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {!p.ativo && <Selo>Inativa</Selo>}
                    {p.ativo && (
                      <>
                        <Selo tom={p.qtdServicos > 0 ? "sucesso" : "alerta"}>
                          {p.qtdServicos} serviço{p.qtdServicos === 1 ? "" : "s"}
                        </Selo>
                        <Selo tom={p.qtdFaixas > 0 ? "sucesso" : "alerta"}>
                          {p.qtdFaixas > 0 ? "Com expediente" : "Sem expediente"}
                        </Selo>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
