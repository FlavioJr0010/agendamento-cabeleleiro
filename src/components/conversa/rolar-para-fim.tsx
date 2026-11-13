"use client";

import { useEffect, useRef } from "react";

/** Mantém a conversa rolada até a última mensagem. */
export function RolarParaFim({ chave }: { chave: number }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [chave]);
  return <li ref={ref} aria-hidden className="h-px" />;
}
