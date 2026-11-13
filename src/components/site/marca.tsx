import Link from "next/link";

/** Monograma + nome do salão. */
export function Marca({ nome, claro = false }: { nome: string; claro?: boolean }) {
  const inicial = nome.trim().charAt(0).toUpperCase();
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label={`${nome} — página inicial`}>
      <span
        aria-hidden
        className={`font-display grid size-9 place-items-center rounded-full border text-lg italic ${
          claro ? "border-ink-foreground/40 text-ink-foreground" : "border-primary/40 text-primary"
        }`}
      >
        {inicial}
      </span>
      <span className={`font-display text-xl font-medium tracking-tight ${claro ? "text-ink-foreground" : ""}`}>
        {nome}
      </span>
    </Link>
  );
}
