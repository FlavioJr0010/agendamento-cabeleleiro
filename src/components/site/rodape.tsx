import { MapPin, MessageCircle, Phone } from "lucide-react";
import { Instagram } from "@/components/icones";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { linkInstagram, linkMapa, linkWhatsapp, obterConfiguracoes, obterHorarioFuncionamento } from "@/lib/salao";
import { Marca } from "./marca";

export async function Rodape() {
  const [c, horarios, ano] = await Promise.all([obterConfiguracoes(), obterHorarioFuncionamento(), anoAtual()]);
  const whatsapp = linkWhatsapp(c.whatsapp, `Olá! Vim pelo site do ${c.nome}.`);
  const instagram = linkInstagram(c.instagram);
  const mapa = linkMapa(c.endereco, c.cidade);

  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Marca nome={c.nome} claro />
          <p className="mt-4 max-w-sm text-sm text-ink-foreground/70">{c.slogan}</p>
          <Link
            href="/agendar"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-ink-foreground px-5 text-sm font-medium text-ink hover:opacity-90"
          >
            Agendar horário
          </Link>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/60">Horários</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {horarios.map((h) => (
              <div key={h.dia} className="contents">
                <dt className="text-ink-foreground/70">{h.dia}</dt>
                <dd className="tabular-nums">{h.horario ?? <span className="text-ink-foreground/50">Fechado</span>}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/60">Contato</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {c.endereco && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                {mapa ? (
                  <a href={mapa} target="_blank" rel="noreferrer" className="hover:underline">
                    {c.endereco}
                    {c.cidade && <span className="block text-ink-foreground/60">{c.cidade}</span>}
                  </a>
                ) : (
                  c.endereco
                )}
              </li>
            )}
            {whatsapp && (
              <li className="flex gap-2.5">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <a href={whatsapp} target="_blank" rel="noreferrer" className="hover:underline">
                  WhatsApp {c.whatsapp}
                </a>
              </li>
            )}
            {c.telefone && (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <a href={`tel:${c.telefone.replace(/\D/g, "")}`} className="hover:underline">
                  {c.telefone}
                </a>
              </li>
            )}
            {instagram && (
              <li className="flex gap-2.5">
                <Instagram className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <a href={instagram.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {instagram.usuario}
                </a>
              </li>
            )}
            {!c.endereco && !whatsapp && !c.telefone && !instagram && (
              <li className="text-ink-foreground/60">Contatos em breve.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink-foreground/50 sm:px-6">
          <p>
            © {ano} {c.nome}. Todos os direitos reservados.
          </p>
          <p>Agendamento online</p>
        </div>
      </div>
    </footer>
  );
}

async function anoAtual() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
