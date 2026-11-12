import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cabecalho } from "@/components/cabecalho";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Salão – Agendamento", template: "%s · Salão" },
  description: "Agende seu horário, converse com o salão e acompanhe seus atendimentos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Cabecalho />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
