import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { FormAcao } from "@/components/form-acao";
import { Botao, Esqueleto, Secao, Selo } from "@/components/ui";
import { obterServico } from "@/db/consultas/painel";
import { exigirSessao } from "@/lib/sessao";
import { alternarAtivoServico, atualizarServico } from "../actions";
import { CamposServico } from "../campos-servico";

export const metadata: Metadata = { title: "Editar serviço" };

export default function PaginaServico({ params }: PageProps<"/painel/servicos/[id]">) {
  return (
    <Suspense fallback={<Esqueleto linhas={4} />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/painel/servicos/[id]">["params"] }) {
  await exigirSessao(["dona"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const servico = await obterServico(id);
  if (!servico) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/painel/servicos" className="text-sm text-muted hover:text-foreground">
          ← Serviços
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{servico.nome}</h1>
          {!servico.ativo && <Selo>Inativo</Selo>}
        </div>
      </div>

      <Secao titulo="Dados do serviço">
        <FormAcao action={atualizarServico.bind(null, servico.id)} className="flex flex-col gap-4">
          <CamposServico valores={servico} />
          <p className="text-xs text-muted">
            Mudanças de preço e duração valem para novos agendamentos; os já marcados mantêm os valores originais.
          </p>
          <div>
            <Botao type="submit">Salvar alterações</Botao>
          </div>
        </FormAcao>
      </Secao>

      <Secao
        titulo={servico.ativo ? "Desativar serviço" : "Reativar serviço"}
        descricao={
          servico.ativo
            ? "O serviço deixa de aparecer para as clientes. O histórico de atendimentos é mantido."
            : "O serviço volta a aparecer para agendamento."
        }
      >
        <FormAcao
          action={alternarAtivoServico.bind(null, servico.id)}
          confirmar={servico.ativo ? `Desativar "${servico.nome}"?` : undefined}
          className="flex flex-col gap-2"
        >
          <div>
            <Botao type="submit" variante={servico.ativo ? "perigo" : "secundario"}>
              {servico.ativo ? "Desativar" : "Reativar"}
            </Botao>
          </div>
        </FormAcao>
      </Secao>
    </div>
  );
}
