import { CalendarDays, LayoutDashboard, LogOut, Mail, MessagesSquare, Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AreaCliente } from "@/components/site/area-cliente";
import { Avatar, classeBotao } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { BotaoSair } from "./botao-sair";

export const metadata: Metadata = { title: "Minha conta" };

const NOME_PAPEL = { cliente: "Cliente", profissional: "Profissional", dona: "Administração" } as const;

export default function PaginaConta() {
  return (
    <AreaCliente titulo="Minha conta" descricao="Seus dados de acesso e contato.">
      <Suspense fallback={<Carregando />}>
        <DadosConta />
      </Suspense>
    </AreaCliente>
  );
}

async function DadosConta() {
  const { user } = await exigirSessao();
  const equipe = user.papel === "dona" || user.papel === "profissional";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
        <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary-soft/70 to-accent-soft/50 p-6">
          <Avatar nome={user.name} tamanho="grande" />
          <div className="min-w-0">
            <p className="font-display truncate text-2xl">{user.name}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted">
              <ShieldCheck className="size-4" aria-hidden />
              {NOME_PAPEL[user.papel as keyof typeof NOME_PAPEL] ?? user.papel}
            </p>
          </div>
        </div>
        <dl className="divide-y divide-border">
          <Dado icone={<Mail />} rotulo="E-mail" valor={user.email} />
          <Dado icone={<Phone />} rotulo="WhatsApp" valor={user.telefone || <span className="text-muted">Não informado</span>} />
        </dl>
        <p className="border-t border-border bg-surface/50 px-6 py-3 text-xs text-muted">
          Precisa corrigir algum dado? Envie uma mensagem ao salão.
        </p>
      </section>

      <aside className="flex flex-col gap-3">
        {equipe && (
          <Link href="/painel" className={`${classeBotao()} w-full`}>
            <LayoutDashboard aria-hidden /> Abrir painel do salão
          </Link>
        )}
        <Atalho href="/meus-agendamentos" icone={<CalendarDays />} titulo="Meus agendamentos" texto="Próximos horários e histórico" />
        <Atalho href="/mensagens" icone={<MessagesSquare />} titulo="Mensagens" texto="Fale com a equipe do salão" />
        <div className="mt-2">
          <BotaoSair icone={<LogOut className="size-4" aria-hidden />} />
        </div>
      </aside>
    </div>
  );
}

function Dado({ icone, rotulo, valor }: { icone: ReactNode; rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-muted [&>svg]:size-4">
        {icone}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{rotulo}</dt>
        <dd className="truncate font-medium">{valor}</dd>
      </div>
    </div>
  );
}

function Atalho({ href, icone, titulo, texto }: { href: string; icone: ReactNode; titulo: string; texto: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
    >
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-[1.1rem]">
        {icone}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{titulo}</span>
        <span className="block text-sm text-muted">{texto}</span>
      </span>
    </Link>
  );
}

function Carregando() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true" aria-label="Carregando">
      <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      <div className="h-48 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
