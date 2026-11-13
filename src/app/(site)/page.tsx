import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Clock,
  MapPin,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import Image from "next/image";
import { Instagram } from "@/components/icones";
import Link from "next/link";
import { Suspense } from "react";
import { listarEquipe } from "@/db/consultas/agenda";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { imagemDoServico } from "@/lib/imagens";
import {
  linkInstagram,
  linkMapa,
  linkWhatsapp,
  obterConfiguracoes,
  obterHorarioFuncionamento,
  obterServicosDestaque,
} from "@/lib/salao";

const botaoPrimario =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover";
const botaoSecundario =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-7 font-medium transition-colors hover:border-foreground/30";

export default async function Inicio() {
  const [config, horarios, destaques] = await Promise.all([
    obterConfiguracoes(),
    obterHorarioFuncionamento(),
    obterServicosDestaque(),
  ]);
  const diasAbertos = horarios.filter((h) => h.horario);

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-primary-soft blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium tracking-wide text-accent">
              <Sparkles className="size-3.5" aria-hidden />
              Agendamento online, 24 horas
            </p>
            <h1 className="font-display mt-5 text-5xl leading-[1.05] font-medium sm:text-6xl lg:text-7xl">
              {config.slogan.split(" ").slice(0, -1).join(" ")}{" "}
              <em className="text-primary">{config.slogan.split(" ").slice(-1)}</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              {config.sobre ??
                `No ${config.nome}, você escolhe o serviço, a profissional e o melhor horário em poucos toques — e acompanha tudo pelo celular.`}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/agendar" className={botaoPrimario}>
                <CalendarPlus className="size-4" aria-hidden />
                Agendar horário
              </Link>
              <Link href="/servicos" className={botaoSecundario}>
                Ver serviços e preços
              </Link>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-1 gap-3 text-sm text-muted sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-accent" aria-hidden />
                Confirmação pelo salão
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" aria-hidden />
                Pagamento no local
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-accent" aria-hidden />
                Lembrete do horário
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/10 sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src="/imagens/hero-escova.webp"
                alt="Cabeleireira finalizando uma escova em cliente no salão"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            {diasAbertos.length > 0 && (
              <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur sm:left-[-2rem]">
                <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                  <Clock className="size-5" aria-hidden />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">Abertos {resumoDias(diasAbertos.map((d) => d.dia))}</span>
                  <span className="text-muted">{diasAbertos[0].horario}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Serviços em destaque ── */}
      {destaques.length > 0 && (
        <section className="bg-surface py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Cabecalho
              sobretitulo="Serviços"
              titulo="Cuidado do corte à finalização"
              acao={
                <Link href="/servicos" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                  Todos os serviços <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {destaques.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/agendar?servico=${s.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={imagemDoServico(s)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl">{s.nome}</h3>
                        <span className="shrink-0 font-semibold tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{formatarDuracao(s.duracaoMin)}</p>
                      {s.descricao && <p className="mt-3 line-clamp-2 text-sm text-muted">{s.descricao}</p>}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary">
                        Agendar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Como funciona ── */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Cabecalho sobretitulo="Como funciona" titulo="Seu horário em menos de um minuto" centro />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icone: Scissors, titulo: "Escolha o serviço", texto: "Veja preços e duração de cada serviço antes de decidir." },
              {
                icone: UserRoundCheck,
                titulo: "Escolha a profissional",
                texto: "Prefere alguém específico? Escolha. Senão, mostramos todos os horários livres.",
              },
              {
                icone: CalendarCheck,
                titulo: "Escolha o horário",
                texto: "Só aparecem horários realmente livres. O salão confirma e você recebe um lembrete.",
              },
            ].map((p, i) => (
              <li key={p.titulo} className="relative rounded-3xl border border-border bg-card p-7">
                <span className="font-display absolute top-5 right-6 text-5xl text-border">{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <p.icone className="size-6" aria-hidden />
                </span>
                <h3 className="font-display mt-5 text-xl">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link href="/agendar" className={botaoPrimario}>
              Começar agora <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── O espaço ── */}
      <section id="espaco" className="scroll-mt-20 bg-ink py-20 text-ink-foreground">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-3xl">
              <Image src="/imagens/espaco-salao.webp" alt="Salão amplo com cadeiras e espelhos iluminados" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl">
              <Image src="/imagens/espaco-cadeiras.webp" alt="Cadeiras de atendimento em tom rosé" fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl">
              <Image src="/imagens/espaco-espelhos.webp" alt="Bancada com espelhos redondos" fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">O espaço</p>
            <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Um lugar pensado para você relaxar</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-foreground/70">
              Ambiente acolhedor, produtos profissionais e uma equipe que cuida de cada detalhe — do diagnóstico do
              cabelo à finalização.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {["Produtos profissionais", "Horário marcado, sem espera", "Atendimento individual", "Ambiente climatizado"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3 text-ink-foreground/90">
                    <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Equipe ── */}
      <Suspense fallback={null}>
        <Equipe />
      </Suspense>

      {/* ── Contato ── */}
      <section id="contato" className="scroll-mt-20 bg-surface py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Cabecalho sobretitulo="Visite-nos" titulo={`Te esperamos no ${config.nome}`} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Contato
                icone={MapPin}
                titulo="Endereço"
                valor={config.endereco ? [config.endereco, config.cidade].filter(Boolean).join(" — ") : "Em breve"}
                href={linkMapa(config.endereco, config.cidade)}
                acao="Abrir no mapa"
              />
              <Contato
                icone={MessageCircle}
                titulo="WhatsApp"
                valor={config.whatsapp ?? "Em breve"}
                href={linkWhatsapp(config.whatsapp, `Olá! Vim pelo site do ${config.nome}.`)}
                acao="Conversar"
              />
              <Contato
                icone={Instagram}
                titulo="Instagram"
                valor={linkInstagram(config.instagram)?.usuario ?? "Em breve"}
                href={linkInstagram(config.instagram)?.url ?? null}
                acao="Ver perfil"
              />
              <Contato icone={CalendarPlus} titulo="Agendamento" valor="Online, a qualquer hora" href="/agendar" acao="Agendar" interno />
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-7">
            <h3 className="font-display text-2xl">Horário de funcionamento</h3>
            <dl className="mt-5 divide-y divide-border">
              {horarios.map((h) => (
                <div key={h.dia} className="flex items-center justify-between py-3 text-sm">
                  <dt className="font-medium">{h.dia}</dt>
                  <dd className={`tabular-nums ${h.horario ? "" : "text-muted"}`}>{h.horario ?? "Fechado"}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Chamada final ── */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div aria-hidden className="absolute -top-24 -left-24 size-72 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="absolute -right-16 -bottom-24 size-72 rounded-full bg-accent/30 blur-2xl" />
            <h2 className="font-display relative text-4xl sm:text-5xl">Pronta para se cuidar?</h2>
            <p className="relative mx-auto mt-4 max-w-md text-primary-foreground/80">
              Escolha o melhor horário para você. Leva menos de um minuto.
            </p>
            <Link
              href="/agendar"
              className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-card px-7 font-medium text-foreground shadow-lg hover:opacity-95"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Agendar horário
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

async function Equipe() {
  const equipe = await listarEquipe();
  if (equipe.length === 0) return null;
  return (
    <section id="equipe" className="scroll-mt-20 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Cabecalho sobretitulo="Equipe" titulo="Profissionais que cuidam de você" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {equipe.map((p) => (
            <li key={p.id} className="flex flex-col rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <span className="font-display grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary-soft to-accent-soft text-2xl text-primary">
                  {p.nome.trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <h3 className="font-display text-xl">{p.nome}</h3>
                  {p.servicos.length > 0 && <p className="text-sm text-muted">{p.servicos.slice(0, 3).join(" · ")}</p>}
                </div>
              </div>
              {p.bio && <p className="mt-4 text-sm leading-relaxed text-muted">{p.bio}</p>}
              <Link
                href={`/agendar?profissional=${p.id}`}
                className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary hover:underline"
              >
                Agendar com {p.nome.split(" ")[0]} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cabecalho({
  sobretitulo,
  titulo,
  acao,
  centro,
}: {
  sobretitulo: string;
  titulo: string;
  acao?: React.ReactNode;
  centro?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${centro ? "justify-center text-center" : ""}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{sobretitulo}</p>
        <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{titulo}</h2>
      </div>
      {acao}
    </div>
  );
}

function Contato({
  icone: Icone,
  titulo,
  valor,
  href,
  acao,
  interno,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  valor: string;
  href: string | null;
  acao: string;
  interno?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <Icone className="size-5 text-primary" aria-hidden />
      <p className="mt-3 text-sm text-muted">{titulo}</p>
      <p className="mt-0.5 font-medium">{valor}</p>
      {href &&
        (interno ? (
          <Link href={href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {acao} →
          </Link>
        ) : (
          <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {acao} →
          </a>
        ))}
    </div>
  );
}

/** ["Terça", "Quarta", ..., "Sábado"] → "de terça a sábado" */
function resumoDias(dias: string[]) {
  if (dias.length === 1) return `às ${dias[0].toLowerCase()}s`;
  if (dias.length === 7) return "todos os dias";
  return `de ${dias[0].toLowerCase()} a ${dias[dias.length - 1].toLowerCase()}`;
}
