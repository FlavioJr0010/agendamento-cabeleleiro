"use client";

import { TelaErro } from "@/components/tela-erro";

export default function ErroPainel(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <TelaErro {...props} inicio="/painel" />;
}
