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
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-muted">{descricao}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

const estiloCampo =
  "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function Campo({
  rotulo,
  id,
  dica,
  className = "",
  ...props
}: ComponentProps<"input"> & { rotulo: string; id: string; dica?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input id={id} name={id} className={estiloCampo} {...props} />
      {dica && <p className="text-xs text-muted">{dica}</p>}
    </div>
  );
}

export function AreaTexto({
  rotulo,
  id,
  className = "",
  ...props
}: ComponentProps<"textarea"> & { rotulo: string; id: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <textarea
        id={id}
        name={id}
        rows={3}
        className={`${estiloCampo} h-auto py-2`}
        {...props}
      />
    </div>
  );
}

type VarianteBotao = "primario" | "secundario" | "perigo" | "discreto";

const estilosBotao: Record<VarianteBotao, string> = {
  primario: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secundario: "border border-border bg-card hover:bg-surface",
  perigo: "border border-danger/40 text-danger hover:bg-danger/10",
  discreto: "text-muted hover:bg-surface hover:text-foreground",
};

export function Botao({
  variante = "primario",
  tamanho = "normal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao; tamanho?: "normal" | "pequeno" }) {
  const altura = tamanho === "pequeno" ? "h-9 px-4 text-sm" : "h-11 px-5";
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-opacity disabled:opacity-60 ${altura} ${estilosBotao[variante]} ${className}`}
      {...props}
    />
  );
}

export function Selo({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "sucesso" | "alerta" }) {
  const cores = {
    neutro: "bg-border/60 text-muted",
    sucesso: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    alerta: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cores[tom]}`}>{children}</span>;
}

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
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

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="font-display grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-soft to-accent-soft text-lg text-primary"
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
          <a href={voltar.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            ← {voltar.rotulo}
          </a>
        )}
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{titulo}</h1>
        {descricao && <p className="mt-2 max-w-2xl text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

/** Estado vazio com ícone, texto e ação. */
export function Vazio({ icone, titulo, texto, acao }: { icone?: ReactNode; titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      {icone && <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">{icone}</span>}
      <p className="font-medium">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-muted">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

/** Indicador numérico (KPI). */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{rotulo}</p>
        {icone && <span className="text-muted">{icone}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
      {detalhe && <p className="mt-1 text-sm text-muted">{detalhe}</p>}
    </div>
  );
}
