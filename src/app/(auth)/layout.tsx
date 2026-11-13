import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Marca } from "@/components/site/marca";
import { obterConfiguracoes } from "@/lib/salao";

export default async function LayoutAuth({ children }: LayoutProps<"/">) {
  const config = await obterConfiguracoes();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Marca nome={config.nome} />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            Voltar ao site
          </Link>
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</main>
      </div>
      <div className="relative hidden lg:block">
        <Image
          src="/imagens/auth-retrato.webp"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-ink-foreground">
          <p className="font-display max-w-md text-4xl leading-tight">{config.slogan}.</p>
          <p className="mt-3 max-w-sm text-ink-foreground/80">
            Agende, acompanhe e remarque seus horários no {config.nome} quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
}
