import { MapPin, MessageCircle, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TelaGestao } from "@/components/gestao";
import { FormAcao } from "@/components/form-acao";
import { Campo, AreaTexto, Botao, Secao } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { obterConfiguracoes } from "@/lib/salao";
import { salvarConfiguracoes } from "../gestao-actions";

export const metadata: Metadata = { title: "Configurações" };

export default function Pagina() {
  return (
    <TelaGestao titulo="Configurações" descricao="Dados do salão exibidos no site, nos e-mails e nas mensagens às clientes.">
      <Conteudo />
    </TelaGestao>
  );
}

async function Conteudo() {
  await exigirSessao(["dona"]);
  const c = await obterConfiguracoes();
  return (
    <FormAcao action={salvarConfiguracoes} className="flex flex-col gap-6">
      <Secao icone={<Store />} titulo="Identidade" descricao="Como o salão se apresenta no topo do site e nos resultados de busca.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome" rotulo="Nome" defaultValue={c.nome} required maxLength={100} />
          <Campo id="slogan" rotulo="Slogan" defaultValue={c.slogan} required maxLength={160} />
          <AreaTexto
            id="sobre"
            rotulo="Sobre o salão"
            className="sm:col-span-2"
            rows={4}
            maxLength={3000}
            defaultValue={c.sobre ?? ""}
            dica="Aparece na página inicial e na descrição do site em buscadores."
          />
        </div>
      </Secao>

      <Secao icone={<MapPin />} titulo="Endereço" descricao="Usado no rodapé e no link “Abrir no mapa”.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="endereco" rotulo="Endereço" placeholder="Rua, número — bairro" defaultValue={c.endereco ?? ""} />
          <Campo id="cidade" rotulo="Cidade" placeholder="Cidade — UF" defaultValue={c.cidade ?? ""} />
        </div>
      </Secao>

      <Secao icone={<MessageCircle />} titulo="Contato" descricao="Campos vazios não exibem o link correspondente no site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="whatsapp" rotulo="WhatsApp" type="tel" placeholder="(71) 90000-0000" defaultValue={c.whatsapp ?? ""} />
          <Campo id="telefone" rotulo="Telefone" type="tel" placeholder="(71) 3000-0000" defaultValue={c.telefone ?? ""} />
          <Campo id="instagram" rotulo="Instagram (usuário)" placeholder="@seusalao" defaultValue={c.instagram ?? ""} />
          <Campo id="email" rotulo="E-mail" type="email" placeholder="contato@seusalao.com.br" defaultValue={c.email ?? ""} />
        </div>
      </Secao>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 p-3 pl-5 shadow-lg shadow-black/5 backdrop-blur-md">
        <p className="text-sm text-muted">
          As mudanças aparecem no{" "}
          <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
            site
          </Link>{" "}
          assim que você salvar.
        </p>
        <Botao type="submit">Salvar configurações</Botao>
      </div>
    </FormAcao>
  );
}
