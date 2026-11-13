"use client";

import { TelaErro } from "@/components/tela-erro";

export default function Erro(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid flex-1 place-items-center">
      <TelaErro {...props} />
    </main>
  );
}
