import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Cabeçalho + conteúdo das telas de autenticação (o layout cuida da moldura). */
export function Cartao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-4xl tracking-tight">{titulo}</h1>
      {subtitulo && <p className="mt-2 text-muted">{subtitulo}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** Bloco com borda para seções do painel. */
export function Secao({
  titulo,
  descricao,
  acoes,
  icone,
  semEspaco = false,
  className = "",
  children,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  icone?: ReactNode;
  /** Conteúdo encosta nas bordas (tabelas e listas). */
  semEspaco?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          {icone && (
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-[1.05rem]">
              {icone}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-sm text-muted">{descricao}</p>}
          </div>
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      <div className={semEspaco ? "mt-4 pb-1" : "px-5 pt-5 pb-5 sm:px-6 sm:pb-6"}>{children}</div>
    </section>
  );
}

const estiloCampo =
  "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-[0.95rem] outline-none transition-[border-color,box-shadow] placeholder:text-muted/60 hover:border-muted/40 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

function Rotulo({ htmlFor, children, opcional }: { htmlFor: string; children: ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
      {opcional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
    </label>
  );
}

export function Campo({
  rotulo,
  id,
  dica,
  prefixo,
  sufixo,
  opcional,
  className = "",
  ...props
}: ComponentProps<"input"> & {
  rotulo: string;
  id: string;
  dica?: ReactNode;
  /** Texto fixo à esquerda do valor (ex.: "R$"). */
  prefixo?: string;
  /** Texto fixo à direita do valor (ex.: "%", "ml"). */
  sufixo?: string;
  opcional?: boolean;
}) {
  const entrada = (
    <input
      id={id}
      name={id}
      className={`${estiloCampo} ${prefixo ? "pl-10" : ""} ${sufixo ? "pr-11" : ""}`}
      aria-describedby={dica ? `${id}-dica` : undefined}
      {...props}
    />
  );
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Rotulo htmlFor={id} opcional={opcional}>
        {rotulo}
      </Rotulo>
      {prefixo || sufixo ? (
        <div className="relative">
          {prefixo && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-sm text-muted">
              {prefixo}
            </span>
          )}
          {entrada}
          {sufixo && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-sm text-muted">
              {sufixo}
            </span>
          )}
        </div>
      ) : (
        entrada
      )}
      {dica && (
        <p id={`${id}-dica`} className="text-xs text-muted">
          {dica}
        </p>
      )}
    </div>
  );
}

/** Lista de opções com o mesmo visual dos demais campos. */
export function Selecao({
  rotulo,
  id,
  opcoes,
  vazio = "Selecione",
  dica,
  className = "",
  ...props
}: ComponentProps<"select"> & {
  rotulo: string;
  id: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  /** Texto da opção vazia; `false` remove a opção. */
  vazio?: string | false;
  dica?: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <div className="relative">
        <select
          id={id}
          name={id}
          className={`${estiloCampo} appearance-none pr-10`}
          defaultValue={props.defaultValue ?? (vazio === false ? undefined : "")}
          {...props}
        >
          {vazio !== false && (
            <option value="" disabled>
              {vazio}
            </option>
          )}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
      </div>
      {dica && <p className="text-xs text-muted">{dica}</p>}
    </div>
  );
}

export function AreaTexto({
  rotulo,
  id,
  dica,
  opcional,
  className = "",
  ...props
}: ComponentProps<"textarea"> & { rotulo: string; id: string; dica?: ReactNode; opcional?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Rotulo htmlFor={id} opcional={opcional}>
        {rotulo}
      </Rotulo>
      <textarea id={id} name={id} rows={3} className={`${estiloCampo} h-auto resize-y py-2.5 leading-relaxed`} {...props} />
      {dica && <p className="text-xs text-muted">{dica}</p>}
    </div>
  );
}

type VarianteBotao = "primario" | "secundario" | "perigo" | "discreto";

const estilosBotao: Record<VarianteBotao, string> = {
  primario: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover",
  secundario: "border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:border-muted/40 hover:bg-surface",
  perigo: "border border-danger/40 text-danger hover:bg-danger/10",
  discreto: "text-muted hover:bg-surface hover:text-foreground",
};

const tamanhosBotao = {
  normal: "h-11 px-5 text-[0.95rem]",
  pequeno: "h-9 px-4 text-sm",
  icone: "size-9 text-sm",
};

/** Classes de botão para usar em <Link> com o mesmo visual de <Botao>. */
export function classeBotao(variante: VarianteBotao = "primario", tamanho: keyof typeof tamanhosBotao = "normal") {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 [&>svg]:size-4 ${tamanhosBotao[tamanho]} ${estilosBotao[variante]}`;
}

export function Botao({
  variante = "primario",
  tamanho = "normal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao; tamanho?: keyof typeof tamanhosBotao }) {
  return <button className={`${classeBotao(variante, tamanho)} ${className}`} {...props} />;
}

export type TomSelo = "neutro" | "sucesso" | "alerta" | "perigo" | "info" | "primario";

const coresSelo: Record<TomSelo, string> = {
  neutro: "bg-surface text-muted ring-border",
  sucesso: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/20",
  alerta: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-400/20",
  perigo: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-400/20",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20",
  primario: "bg-primary-soft text-primary ring-primary/15",
};

export function Selo({ children, tom = "neutro", ponto = false }: { children: ReactNode; tom?: TomSelo; ponto?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${coresSelo[tom]}`}>
      {ponto && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
      {children}
    </p>
  );
}

export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}

/** Carregamento de uma tela inteira do painel (indicadores + blocos). */
export function EsqueletoPainel() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

const tamanhosAvatar = { pequeno: "size-8 text-sm", normal: "size-11 text-lg", grande: "size-16 text-2xl" };

export function Avatar({ nome, tamanho = "normal" }: { nome: string; tamanho?: keyof typeof tamanhosAvatar }) {
  return (
    <span
      aria-hidden
      className={`font-display grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-soft to-accent-soft text-primary ${tamanhosAvatar[tamanho]}`}
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Cabeçalho padrão das páginas (título, descrição e ações à direita). */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {voltar && (
          <Link
            href={voltar.href}
            className="group mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            {voltar.rotulo}
          </Link>
        )}
        <h1 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">{titulo}</h1>
        {descricao && <p className="mt-2 max-w-2xl text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

/** Estado vazio com ícone, texto e ação. */
export function Vazio({
  icone,
  titulo,
  texto,
  acao,
  compacto = false,
}: {
  icone?: ReactNode;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
  /** Versão sem borda, para dentro de seções. */
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compacto ? "px-4 py-8" : "rounded-2xl border border-dashed border-border px-6 py-12"
      }`}
    >
      {icone && (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary [&>svg]:size-5">{icone}</span>
      )}
      <p className="font-medium">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-pretty text-muted">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

type TomIndicador = "neutro" | "positivo" | "negativo" | "alerta";

const coresIndicador: Record<TomIndicador, string> = {
  neutro: "bg-primary-soft text-primary",
  positivo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  negativo: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  alerta: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

/** Indicador numérico (KPI). */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
  tom = "neutro",
  href,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  tom?: TomIndicador;
  /** Torna o cartão inteiro um link. */
  href?: string;
}) {
  const conteudo = (
    <>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{rotulo}</p>
        {icone && (
          <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl [&>svg]:size-[1.05rem] ${coresIndicador[tom]}`}>
            {icone}
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-[1.75rem]">{valor}</p>
      {detalhe && <p className="mt-1.5 text-xs leading-relaxed text-muted">{detalhe}</p>}
    </>
  );
  const classe = "block min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]";
  return href ? (
    <Link href={href} className={`${classe} transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md hover:shadow-primary/5`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/** Tabela responsiva: rolagem horizontal em telas estreitas. */
export function Tabela({ colunas, children, rotulo }: { colunas: ReactNode[]; children: ReactNode; rotulo?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm" aria-label={rotulo}>
        <thead>
          <tr className="border-y border-border bg-surface/60 text-xs font-medium tracking-wide text-muted uppercase">
            {colunas.map((c, i) => (
              <th key={i} scope="col" className="px-5 py-2.5 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border [&_td]:px-5 [&_td]:py-3.5 [&_td:first-child]:sm:pl-6 [&_td:last-child]:sm:pr-6">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** Bloco recolhível (ex.: formulário de cadastro acima de uma lista). */
export function Expansivel({
  titulo,
  descricao,
  icone,
  aberto,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  icone?: ReactNode;
  aberto?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={aberto} className="group rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-4 transition-colors select-none hover:bg-surface/50 sm:px-6 [&::-webkit-details-marker]:hidden">
        {icone && (
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-[1.05rem]">
            {icone}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-tight">{titulo}</span>
          {descricao && <span className="block text-sm text-muted">{descricao}</span>}
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </details>
  );
}

/** Barra de filtros acima do conteúdo (datas, buscas). */
export function BarraFiltros({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <form
      action={action}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)] [&_input]:h-10 [&_input]:min-w-40 [&>button]:h-10"
    >
      {children}
    </form>
  );
}
