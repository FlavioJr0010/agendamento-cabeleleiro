import { ChevronRight, Plus, Scissors } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAcao } from "@/components/form-acao";
import { Botao, CabecalhoPagina, EsqueletoPainel, Expansivel, Secao, Selo, Tabela, Vazio } from "@/components/ui";
import { listarServicos } from "@/db/consultas/painel";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { exigirSessao } from "@/lib/sessao";
import { criarServico } from "./actions";
import { CamposServico } from "./campos-servico";

export const metadata: Metadata = { title: "Serviços" };

export default function PaginaServicos() {
  return (
    <>
      <CabecalhoPagina titulo="Serviços" descricao="Catálogo exibido no site, com preço, duração e quem realiza cada serviço." />
      <Suspense fallback={<EsqueletoPainel />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const lista = await listarServicos();
  const ativos = lista.filter((s) => s.ativo).length;

  return (
    <div className="flex flex-col gap-6">
      <Expansivel
        icone={<Plus />}
        titulo="Novo serviço"
        descricao="Depois de cadastrar, vincule o serviço às profissionais que o realizam."
        aberto={lista.length === 0}
      >
        <FormAcao action={criarServico} limparAoConcluir className="flex flex-col gap-4">
          <CamposServico prefixo="novo-" />
          <div className="flex justify-end border-t border-border pt-4">
            <Botao type="submit">Cadastrar serviço</Botao>
          </div>
        </FormAcao>
      </Expansivel>

      <Secao titulo="Catálogo" descricao={`${ativos} ativo${ativos === 1 ? "" : "s"} de ${lista.length}`} semEspaco>
        {lista.length === 0 ? (
          <Vazio compacto icone={<Scissors />} titulo="Nenhum serviço cadastrado" texto="Cadastre o primeiro serviço no formulário acima." />
        ) : (
          <Tabela rotulo="Serviços" colunas={["Serviço", "Duração", "Preço", "Profissionais", <span key="a" className="sr-only">Abrir</span>]}>
            {lista.map((s) => (
              <tr key={s.id} className={`group relative transition-colors hover:bg-surface/60 ${s.ativo ? "" : "text-muted"}`}>
                <td>
                  <Link href={`/painel/servicos/${s.id}`} className="font-medium after:absolute after:inset-0">
                    {s.nome}
                  </Link>
                </td>
                <td className="text-muted tabular-nums">
                  {formatarDuracao(s.duracaoMin)}
                  {s.intervaloMin > 0 && <span className="text-xs"> + {s.intervaloMin} min de intervalo</span>}
                </td>
                <td className="font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</td>
                <td>
                  {!s.ativo ? (
                    <Selo>Inativo</Selo>
                  ) : s.qtdProfissionais === 0 ? (
                    <Selo tom="alerta" ponto>
                      Sem profissional
                    </Selo>
                  ) : (
                    <Selo tom="sucesso" ponto>
                      {s.qtdProfissionais} profissional{s.qtdProfissionais > 1 ? "is" : ""}
                    </Selo>
                  )}
                </td>
                <td className="w-10 text-right">
                  <ChevronRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>
    </div>
  );
}
