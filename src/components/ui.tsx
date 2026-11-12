import type { ComponentProps, ReactNode } from "react";

export function Cartao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}
        <div className="mt-6">{children}</div>
      </div>
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
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
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
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

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
  primario: "bg-primary text-primary-foreground hover:opacity-90",
  secundario: "border border-border hover:bg-border/40",
  perigo: "border border-danger/40 text-danger hover:bg-danger/10",
  discreto: "text-muted hover:bg-border/40 hover:text-foreground",
};

export function Botao({
  variante = "primario",
  tamanho = "normal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao; tamanho?: "normal" | "pequeno" }) {
  const altura = tamanho === "pequeno" ? "h-8 px-3 text-sm" : "h-11 px-4";
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-opacity disabled:opacity-60 ${altura} ${estilosBotao[variante]} ${className}`}
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
        <div key={i} className="h-12 animate-pulse rounded-lg bg-border/60" />
      ))}
    </div>
  );
}

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 text-lg font-semibold text-primary"
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}
