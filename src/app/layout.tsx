import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { obterConfiguracoes } from "@/lib/salao";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export async function generateMetadata(): Promise<Metadata> {
  const c = await obterConfiguracoes();
  return {
    title: { default: `${c.nome} — ${c.slogan}`, template: `%s · ${c.nome}` },
    description: c.sobre ?? `Agende online no ${c.nome}: escolha o serviço, a profissional e o melhor horário.`,
    openGraph: { siteName: c.nome, locale: "pt_BR", type: "website", images: ["/imagens/hero-escova.webp"] },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#131012" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
