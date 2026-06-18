"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { dict, TOKEN, MOCK, type Lang } from "./content";

// Вертикальный ролик бариста в hero. Лежит в public/brand/barista.mp4.
const HERO_VIDEO: string | null = "/brand/barista.mp4";

/* ---------- helpers ---------- */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
      {children}
    </span>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.6, ease: "easeOut" });
    const unsub = mv.on("change", (v) => setVal(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, mv]);
  return <span ref={ref}>{val.toLocaleString("ru-RU")}</span>;
}

/* ---------- page ---------- */

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = dict[lang];
  const remaining = TOKEN.supply - MOCK.burned;
  const burnedPct = (MOCK.burned / TOKEN.supply) * 100;

  const nav: { id: string; label: string }[] = [
    { id: "story", label: t.nav.story },
    { id: "how", label: t.nav.how },
    { id: "token", label: t.nav.token },
    { id: "burns", label: t.nav.burns },
    { id: "menu", label: t.nav.menu },
    { id: "buy", label: t.nav.buy },
  ];

  return (
    <main className="relative z-0">
      {/* ---------- NAV ---------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="flex items-center gap-3">
            <Image src="/brand/doffa-logo.jpeg" alt="DOFFA" width={40} height={40} className="rounded-full ring-1 ring-gold/40" />
            <span className="display text-lg font-extrabold tracking-tight text-cream-soft">
              DOFFA<span className="text-teal">.</span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 lg:flex">
            {nav.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="text-sm text-cream/70 transition hover:text-gold">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5">
            {(["ru", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                  lang === l ? "bg-gold text-ink" : "text-cream/60 hover:text-cream"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section id="top" className="relative flex min-h-screen items-end overflow-hidden sm:items-center">
        {HERO_VIDEO ? (
          <video
            src={HERO_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/cafe-night-2.jpeg"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <Image
            src="/brand/cafe-night-2.jpeg"
            alt="COFFEE DOFFA"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        )}
        {/* затемнение для читаемости текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" />
        <div className="absolute inset-0 bg-ink/20" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-amber/20 blur-[120px]" />

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-amber text-glow">{t.hero.kicker}</p>
            <h1 className="display max-w-3xl text-5xl font-extrabold leading-[1.02] text-cream-soft sm:text-7xl">
              {t.hero.title1}
              <br />
              <span className="text-amber text-glow">{t.hero.title2}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-cream/80">{t.hero.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-gold px-7 py-3 font-bold text-ink opacity-90">
                {t.hero.ctaBuy}
                <span className="rounded-full bg-ink/20 px-2 py-0.5 text-[10px] uppercase">{t.hero.soon}</span>
              </span>
              <a href="#menu" className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
                {t.hero.ctaMenu}
              </a>
            </div>
          </motion.div>
        </div>

        {/* подсказка прокрутки */}
        <div className="absolute inset-x-0 bottom-5 flex justify-center">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="text-cream/40"
          >
            ↓
          </motion.div>
        </div>
      </section>

      {/* ---------- MARQUEE ---------- */}
      <div className="overflow-hidden border-y border-white/5 bg-espresso-deep/40 py-3">
        <div className="display flex gap-10 whitespace-nowrap px-5 text-sm uppercase tracking-[0.3em] text-cream/40">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex gap-10">
              <span>1 чашка = 1 токен</span><span className="text-teal">·</span>
              <span>Since 2021</span><span className="text-teal">·</span>
              <span>Solana SPL</span><span className="text-teal">·</span>
              <span>Deflationary</span><span className="text-teal">·</span>
              <span>Halal spirit</span><span className="text-teal">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- STORY ---------- */}
      <Section id="story">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Tag>{t.story.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.story.title}</h2>
            <div className="mt-6 space-y-4 text-cream/75">
              {t.story.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-3xl bg-teal/10 blur-2xl" />
              <Image src="/brand/doffa-logo.jpeg" alt="DOFFA Espresso Bar" fill sizes="(max-width:768px) 90vw, 28rem" className="relative rounded-3xl object-cover ring-1 ring-gold/30" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ---------- HOW ---------- */}
      <Section id="how">
        <Reveal>
          <div className="text-center">
            <Tag>{t.how.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.how.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.how.sub}</p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="card h-full rounded-2xl p-7">
                <div className="display mb-4 text-3xl font-extrabold text-teal">0{i + 1}</div>
                <h3 className="display text-xl font-bold text-cream-soft">{s.t}</h3>
                <p className="mt-3 text-sm text-cream/70">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- TOKEN ---------- */}
      <Section id="token">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <Tag>{t.token.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.token.title}</h2>
            <p className="mt-4 text-cream/70">{t.token.sub}</p>
            <dl className="mt-7 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {t.token.rows.map((r) => (
                <div key={r.k} className="flex items-center justify-between bg-white/[0.02] px-5 py-3">
                  <dt className="text-sm text-cream/60">{r.k}</dt>
                  <dd className="display text-sm font-bold text-cream-soft">{r.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="card rounded-2xl p-7">
              <p className="display mb-6 text-lg font-bold text-cream-soft">Allocation</p>
              <div className="space-y-5">
                {t.token.alloc.map((a, i) => (
                  <div key={a.name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-cream/75">{a.name}</span>
                      <span className="display font-bold text-gold">{a.pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${a.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ---------- BURNS ---------- */}
      <Section id="burns">
        <Reveal>
          <div className="text-center">
            <Tag>{t.burns.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.burns.title}</h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t.burns.supply} value={TOKEN.supply.toLocaleString("ru-RU")} />
          <Stat label={t.burns.burned} value={<><CountUp to={MOCK.burned} /> 🔥</>} accent />
          <Stat label={t.burns.left} value={remaining.toLocaleString("ru-RU")} />
          <Stat label={t.burns.cups} value={<><CountUp to={MOCK.cupsSold} /> ☕</>} />
        </div>
        <Reveal>
          <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(burnedPct, 1.5)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber to-teal"
            />
          </div>
          <p className="mt-4 text-center text-xs text-cream/50">{t.burns.note}</p>
        </Reveal>
      </Section>

      {/* ---------- MENU ---------- */}
      <Section id="menu">
        <div className="relative overflow-hidden rounded-3xl">
          <Image src="/brand/cafe-night-1.png" alt="DOFFA" width={1200} height={800} className="h-72 w-full object-cover sm:h-96" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          <div className="absolute bottom-0 p-8">
            <Tag>{t.menu.tag}</Tag>
            <h2 className="display mt-4 text-4xl font-bold text-cream-soft">{t.menu.title}</h2>
            <p className="mt-3 max-w-md text-cream/75">{t.menu.sub}</p>
          </div>
        </div>
      </Section>

      {/* ---------- BUY ---------- */}
      <Section id="buy">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Tag>{t.buy.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.buy.title}</h2>
            <p className="mt-4 text-cream/70">{t.buy.sub}</p>
            <div className="mt-7">
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-cream/10 px-7 py-3 font-bold text-cream/60">
                {t.buy.connect}
              </span>
              <p className="mt-2 text-xs uppercase tracking-wider text-teal">{t.buy.soon}</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="space-y-4">
              {t.buy.points.map((p, i) => (
                <li key={i} className="card flex items-start gap-3 rounded-xl p-5">
                  <span className="mt-0.5 text-teal">✦</span>
                  <span className="text-sm text-cream/80">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* ---------- ROADMAP ---------- */}
      <Section id="roadmap">
        <Reveal>
          <Tag>{t.roadmap.tag}</Tag>
          <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.roadmap.title}</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {t.roadmap.phases.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08}>
              <div className={`h-full rounded-2xl border p-6 ${p.done ? "border-teal/50 bg-teal/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
                <div className="flex items-center justify-between">
                  <span className="display text-2xl font-extrabold text-gold">{p.n}</span>
                  {p.done && <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold uppercase text-teal">✓</span>}
                </div>
                <h3 className="display mt-3 text-lg font-bold text-cream-soft">{p.t}</h3>
                <p className="mt-2 text-sm text-cream/65">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- FAQ ---------- */}
      <Section id="faq">
        <Reveal>
          <div className="text-center">
            <Tag>{t.faq.tag}</Tag>
            <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.faq.title}</h2>
          </div>
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {t.faq.items.map((f, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <details className="card group rounded-xl px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-cream-soft">
                  {f.q}
                  <span className="text-gold transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-cream/70">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- CONTACT ---------- */}
      <Section id="contact">
        <Reveal>
          <div className="card rounded-3xl p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <Tag>{t.contact.tag}</Tag>
                <h2 className="display mt-5 text-4xl font-bold text-cream-soft">{t.contact.title}</h2>
                <p className="mt-4 text-cream/70">{t.contact.sub}</p>
                <a
                  href={TOKEN.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-semibold text-gold transition hover:bg-gold hover:text-ink"
                >
                  {t.contact.ig} {TOKEN.instagramHandle}
                </a>
              </div>
              <div className="grid content-center gap-4">
                <InfoRow k={t.contact.address} v={t.contact.addressVal} />
                <InfoRow k={t.contact.hours} v={t.contact.hoursVal} />
                <InfoRow k={t.contact.ig} v={TOKEN.instagramHandle} />
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-white/5 px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="display text-2xl font-extrabold text-cream-soft">DOFFA<span className="text-teal">.</span></span>
            <p className="text-xs uppercase tracking-[0.3em] text-cream/40">Espresso Bar · Since {TOKEN.since}</p>
          </div>
          <div className="gold-line mx-auto my-8 h-px max-w-md" />
          <p className="mx-auto max-w-3xl text-center text-[11px] leading-relaxed text-cream/40">{t.legal}</p>
          <p className="mt-6 text-center text-[11px] text-cream/30">© {new Date().getFullYear()} DOFFA. {TOKEN.symbol} · {TOKEN.network}.</p>
        </div>
      </footer>
    </main>
  );
}

/* ---------- small components ---------- */

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      {children}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <Reveal>
      <div className={`rounded-2xl border p-6 text-center ${accent ? "border-amber/40 bg-amber/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
        <div className="display text-3xl font-extrabold text-cream-soft sm:text-4xl">{value}</div>
        <div className="mt-2 text-xs uppercase tracking-wider text-cream/50">{label}</div>
      </div>
    </Reveal>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <span className="text-sm text-cream/55">{k}</span>
      <span className="display text-sm font-bold text-cream-soft">{v}</span>
    </div>
  );
}
