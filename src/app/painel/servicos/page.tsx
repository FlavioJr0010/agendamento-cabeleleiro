import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { Botao, Esqueleto, Secao, Selo } from "@/components/ui";
import { listarServicos } from "@/db/consultas/painel";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { exigirSessao } from "@/lib/sessao";
import { criarServico } from "./actions";
import { CamposServico } from "./campos-servico";

export const metadata: Metadata = { title: "Serviços" };

export default function PaginaServicos() {
  return (
    <Suspense fallback={<Esqueleto linhas={5} />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const lista = await listarServicos();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>

      <Secao titulo="Novo serviço" descricao="Depois de cadastrar, vincule o serviço às profissionais que o realizam.">
        <FormAcao action={criarServico} limparAoConcluir className="flex flex-col gap-4">
          <CamposServico prefixo="novo-" />
          <div>
            <Botao type="submit">Cadastrar serviço</Botao>
          </div>
        </FormAcao>
      </Secao>

      <Secao titulo={`Cadastrados (${lista.length})`}>
        {lista.length === 0 ? (
          <p className="text-sm text-muted">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {lista.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/painel/servicos/${s.id}`}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-border/40 ${
                    s.ativo ? "" : "opacity-60"
                  }`}
                >
                  <span className="min-w-0 flex-1 font-medium">{s.nome}</span>
                  <span className="text-sm text-muted tabular-nums sm:w-32 sm:text-right">
                    {formatarDuracao(s.duracaoMin)}
                    {s.intervaloMin > 0 && ` + ${s.intervaloMin} min`}
                  </span>
                  <span className="w-24 text-right text-sm font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                  <span className="flex w-full gap-2 sm:w-32 sm:justify-end">
                    {!s.ativo && <Selo>Inativo</Selo>}
                    {s.ativo && s.qtdProfissionais === 0 ? (
                      <Selo tom="alerta">Sem profissional</Selo>
                    ) : (
                      s.ativo && (
                        <Selo tom="sucesso">
                          {s.qtdProfissionais} profissional{s.qtdProfissionais > 1 ? "is" : ""}
                        </Selo>
                      )
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
