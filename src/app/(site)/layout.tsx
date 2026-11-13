import { CabecalhoSite } from "@/components/site/cabecalho-site";
import { Rodape } from "@/components/site/rodape";

export default function LayoutSite({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <CabecalhoSite />
      <main id="conteudo" className="flex flex-1 flex-col">
        {children}
      </main>
      <Rodape />
    </>
  );
}
