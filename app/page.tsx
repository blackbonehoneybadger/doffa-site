"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dict, LANGS, TOKEN, CONTACT, GALLERY, VIDEOS, type Lang } from "./content";
import { REAL, solscanToken, solscanTokenOf, solscanWalletOf, solscanTx, solscanHolders, fetchSupplyOf, fetchBalance, fetchBurnHistory, connectWalletById, disconnectWalletById, type BurnRecord } from "./solana";
import { SmoothScroll, CursorGlow, MouseParallax, TiltCard } from "./cinematic";

// three.js + gsap — тяжёлые библиотеки, грузим отдельным чанком только в
// браузере и только когда компонент реально понадобится (см. hero3d.tsx).
const Hero3D = dynamic(() => import("./hero3d").then((m) => m.Hero3D), { ssr: false });

// Дефолтный ролик в hero, пока владелец кофейни не загрузил свои через /admin.
const DEFAULT_HERO_VIDEO = "/brand/hero.mp4";

/* ---------- helpers ---------- */

function Reveal({ children, delay = 0, blur = true }: { children: React.ReactNode; delay?: number; blur?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98, filter: blur ? "blur(6px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
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

/* ---------- page ---------- */

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "token" | "cafe" | "community" | "buy" | "contact">("story");
  const t = dict[lang];

  // Hero-видео "на сегодня": владелец кофейни загружает через /admin, сайт
  // ротирует по кругу раз в день. Пока ничего не загружено — дефолтное видео.
  const [heroVideo, setHeroVideo] = useState<string>(DEFAULT_HERO_VIDEO);
  useEffect(() => {
    fetch("/api/hero-video")
      .then((r) => r.json())
      .then((d: { ok: boolean; url: string | null }) => {
        if (d.ok && d.url) setHeroVideo(d.url);
      })
      .catch(() => {});
  }, []);

  // Объём НАСТОЯЩЕГО токена (mainnet) — опрашивается каждую секунду, живой счётчик.
  const [realSupply, setRealSupply] = useState<number | null>(null);
  useEffect(() => {
    if (!REAL.mint) return;
    let cancelled = false;
    const tick = () => {
      fetchSupplyOf(REAL)
        .then((v) => { if (!cancelled) setRealSupply(v); })
        .catch(() => { if (!cancelled) setRealSupply(null); });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // История сжиганий — читается напрямую из Solana (мемо "DOFFA coffee burn | ...").
  // Опрашивается каждую секунду, чтобы новое сжигание появлялось в ленте сразу.
  const [burns, setBurns] = useState<BurnRecord[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetchBurnHistory(15)
        .then((v) => { if (!cancelled) setBurns(v); })
        .catch(() => { if (!cancelled) setBurns([]); });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Сверка POS-продаж ↔ Solana burns. Данные из блокчейна через /api/proof/compare.
  // Опрашивается каждую секунду — цифры на сайте не отстают от бота.
  type Compare = { pos_cups: number; solana_burns: number; mismatch: number; status: string; message: string };
  const [compare, setCompare] = useState<Compare | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch("/api/proof/compare")
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setCompare(d as Compare); })
        .catch(() => { if (!cancelled) setCompare(null); });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const loc = t.locale;

  // Направление письма и атрибут языка — для арабского (rtl) и доступности.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir ?? "ltr";
  }, [lang, t.dir]);

  // Настоящий токен (mainnet). Выпущен ли уже mint?
  const realMinted = REAL.mint !== null;
  // Сколько в обороте: live из mainnet, иначе планируемая эмиссия (нетронуто).
  const realCirculating = realSupply !== null ? realSupply : REAL.initialSupply;
  const realBurned = Math.max(REAL.initialSupply - realCirculating, 0);

  // Кошелёк — Phantom, Solflare, Trust Wallet, Backpack (+ Ledger через Phantom/Solflare).
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletBal, setWalletBal] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletModal, setWalletModal] = useState(false);

  const WALLET_OPTS = [
    { id: "phantom",  name: "Phantom",      note: "Ledger ✓" },
    { id: "solflare", name: "Solflare",     note: "Ledger ✓" },
    { id: "trust",    name: "Trust Wallet", note: null },
    { id: "backpack", name: "Backpack",     note: null },
  ] as const;

  const connectWallet = async (id: string) => {
    setWalletModal(false);
    const addr = await connectWalletById(id);
    if (!addr) return;
    setWallet(addr);
    setWalletId(id);
    setWalletBal(null);
    fetchBalance(addr).then(setWalletBal).catch(() => setWalletBal(0));
  };

  const disconnectWallet = async () => {
    if (walletId) await disconnectWalletById(walletId);
    setWallet(null);
    setWalletBal(null);
    setWalletId(null);
    setWalletModal(false);
  };

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "story",     label: t.tabs.story },
    { id: "token",     label: t.tabs.token },
    { id: "cafe",      label: t.tabs.cafe },
    { id: "community", label: t.tabs.community },
    { id: "buy",       label: t.tabs.buy },
    { id: "contact",   label: t.tabs.contact },
  ];

  return (
    <main className="relative z-0">
      <SmoothScroll />
      <CursorGlow />
      {/* ---------- NAV ---------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-5 sm:py-3">
          <a href="#top" className="flex items-center gap-2.5 sm:gap-3">
            <Image src="/brand/doffa-logo.jpeg" alt="DOFFA" width={36} height={36} className="rounded-full ring-1 ring-gold/40 sm:w-[40px] sm:h-[40px]" />
            <span className="display text-base font-extrabold tracking-tight text-cream-soft sm:text-lg">
              DOFFA<span className="text-teal">.</span>
            </span>
          </a>
          <nav className="hidden items-center gap-4 xl:gap-5 lg:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`text-xs xl:text-sm transition ${
                  activeTab === t.id ? "font-semibold text-gold" : "text-cream/70 hover:text-gold"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3 sm:gap-2">
            {/* Wallet connect button */}
            <div className="relative hidden sm:block">
              {wallet ? (
                <>
                  <button
                    onClick={() => setWalletModal((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal transition hover:border-teal/60"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    {wallet.slice(0, 4)}…{wallet.slice(-4)}
                  </button>
                  {walletModal && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setWalletModal(false)} />
                      <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-white/10 bg-ink/95 p-3 shadow-xl backdrop-blur-md">
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-cream/40">{WALLET_OPTS.find((w) => w.id === walletId)?.name}</p>
                        <p className="mb-3 font-mono text-[11px] text-cream/50 break-all">{wallet.slice(0, 8)}…{wallet.slice(-8)}</p>
                        {walletBal !== null && (
                          <p className="mb-3 text-xs font-semibold text-gold">{walletBal.toLocaleString(loc)} $DOFFA</p>
                        )}
                        <button onClick={disconnectWallet} className="w-full rounded-lg bg-white/5 px-3 py-2 text-xs text-cream/70 hover:bg-white/10">
                          {t.buy.disconnect}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWalletModal((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition hover:border-gold/60"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
                    {t.buy.connect}
                  </button>
                  {walletModal && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setWalletModal(false)} />
                      <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-white/10 bg-ink/95 p-3 shadow-xl backdrop-blur-md">
                        <p className="mb-2 text-[10px] uppercase tracking-wider text-cream/40">Выбери кошелёк</p>
                        <div className="flex flex-col gap-1">
                          {WALLET_OPTS.map((w) => (
                            <button
                              key={w.id}
                              onClick={() => connectWallet(w.id)}
                              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-cream transition hover:bg-white/10"
                            >
                              <span>{w.name}</span>
                              {w.note && <span className="text-[10px] text-teal">{w.note}</span>}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-cream/30">Аппаратный кошелёк (Ledger) работает через Phantom или Solflare</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <label className="relative flex items-center">
              <span className="sr-only">Language</span>
              <svg className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-cream/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
              </svg>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                aria-label="Выбор языка"
                className="cursor-pointer appearance-none rounded-full border border-white/10 bg-ink/60 py-1.5 pl-7 pr-7 text-xs font-bold text-cream/80 outline-none transition hover:border-gold/50 hover:text-cream focus:border-gold/60"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code} className="bg-ink text-cream">
                    {l.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 h-3 w-3 text-cream/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </label>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-cream/80 transition hover:text-gold lg:hidden"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* мобильное меню вкладок */}
        {menuOpen && (
          <nav className="border-t border-white/10 bg-ink/95 backdrop-blur-md lg:hidden">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-1 px-5 py-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setMenuOpen(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activeTab === t.id
                      ? "bg-gold/20 font-semibold text-gold"
                      : "text-cream/75 hover:bg-white/5 hover:text-gold"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* ---------- HERO ---------- */}
      <section id="top" className="relative flex min-h-screen items-end overflow-hidden sm:items-center">
        <motion.video
          key={heroVideo}
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          poster="/brand/cafe-night-2.jpeg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          // Видео 720p растянуто на весь экран через object-cover — при апскейле
          // центр кадра (низкоконтрастные окна/стены) выглядит мягче, чем края
          // с высококонтрастной вывеской. Лёгкая коррекция контраста/резкости
          // компенсирует этот эффект без обрезки или замены самого файла.
          style={{ filter: "contrast(1.08) saturate(1.12) brightness(1.02)" }}
          className="absolute inset-0 h-full w-full object-cover object-center [image-rendering:-webkit-optimize-contrast]"
        />
        {/* затемнение для читаемости текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" />
        <div className="absolute inset-0 bg-ink/20" />
        <MouseParallax strength={-14} className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96">
          <div className="glow-pulse h-96 w-96 rounded-full bg-amber/20 blur-[120px]" />
        </MouseParallax>
        <MouseParallax strength={-10} className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80">
          <div className="glow-pulse h-80 w-80 rounded-full bg-teal/15 blur-[110px]" style={{ animationDelay: "2s" }} />
        </MouseParallax>
        <Hero3D className="absolute right-6 top-24 hidden h-40 w-40 sm:block sm:h-52 sm:w-52" />
        {/* эффект пара */}
        <div className="steam" />
        <div className="steam s2" />
        <div className="steam s3" />
        <div className="steam s4" />

        <MouseParallax strength={10} className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-amber text-glow">{t.hero.kicker}</p>
            <h1 className="display max-w-3xl text-5xl font-extrabold leading-[1.02] text-cream-soft sm:text-7xl">
              {t.hero.title1}
              <br />
              <span className="text-amber text-glow">{t.hero.title2}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-cream/80">{t.hero.sub}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-cream/75">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                📍 {t.ui.location}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                🕖 07:00–22:00
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-gold px-7 py-3 font-bold text-ink opacity-90">
                {t.hero.ctaBuy}
                <span className="rounded-full bg-ink/20 px-2 py-0.5 text-[10px] uppercase">{t.hero.soon}</span>
              </span>
              <button onClick={() => setActiveTab("cafe")} className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
                {t.hero.ctaMenu}
              </button>
            </div>
          </motion.div>
        </MouseParallax>

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
        <div className="marquee-track">
          {[0, 1].map((i) => (
            <span key={i} className="display inline-flex shrink-0 items-center gap-10 px-10 text-sm uppercase tracking-[0.3em] text-cream/40">
              <span>1 чашка = 1 токен</span><span className="text-teal">·</span>
              <span>Since 2021</span><span className="text-teal">·</span>
              <span>Solana SPL</span><span className="text-teal">·</span>
              <span>Deflationary</span><span className="text-teal">·</span>
              <span>Halal spirit</span><span className="text-teal">·</span>
              <span>DOFFA</span><span className="text-teal">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- TAB CONTENT ---------- */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* TAB: STORY */}
          {activeTab === "story" && (
            <motion.div key="story" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              {/* VIDEOS */}
              <Section id="videos">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.videos.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.videos.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.videos.sub}</p>
                  </div>
                </Reveal>
                <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:gap-6">
                  {VIDEOS.map((v, i) => (
                    <Reveal key={v.src} delay={i * 0.1}>
                      <div className="group relative aspect-[9/16] overflow-hidden rounded-3xl ring-1 ring-gold/20">
                        <video
                          src={v.src}
                          autoPlay
                          muted
                          loop
                          playsInline
                          aria-label={v.alt}
                          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                      </div>
                    </Reveal>
                  ))}
                </div>
              </Section>

              {/* STORY */}
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
                    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
                      <div className="absolute inset-0 rounded-3xl bg-teal/10 blur-2xl" />
                      <Image src="/brand/bar-shelves.jpg" alt="Бариста DOFFA за стойкой" fill sizes="(max-width:768px) 90vw, 28rem" className="relative rounded-3xl object-cover ring-1 ring-gold/30" />
                    </div>
                  </Reveal>
                </div>
              </Section>

              {/* HOW */}
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
            </motion.div>
          )}

          {/* TAB: TOKEN */}
          {activeTab === "token" && (
            <motion.div key="token" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              {/* TOKEN */}
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
                      <p className="display mb-6 text-lg font-bold text-cream-soft">{t.ui.allocation}</p>
                      <div className="space-y-5">
                        {t.token.alloc.map((a, i) => (
                          <div key={a.name}>
                            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                              <span className="text-cream/75">{a.name}</span>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-cream/40">
                                  {((TOKEN.supply * a.pct) / 100).toLocaleString()} {TOKEN.symbol}
                                </span>
                                <span className="display font-bold text-gold">{a.pct}%</span>
                              </div>
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

              {/* BURNS */}
              <Section id="burns">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.burns.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.burns.title}</h2>
                  </div>
                </Reveal>

                {/* Настоящий токен (mainnet) */}
                <Reveal>
                  <TiltCard max={2.5} className="mt-10 rounded-3xl border border-gold/25 bg-gradient-to-b from-gold/[0.06] to-transparent p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-bold text-cream-soft">{t.burns.realTitle}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
                        {t.burns.realBadge}
                      </span>
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-3">
                      <Stat label={t.burns.supply} value={REAL.initialSupply.toLocaleString(loc)} unit={TOKEN.symbol} />
                      <Stat label={t.burns.burned} value={realBurned.toLocaleString(loc)} unit={`🔥 ${TOKEN.symbol}`} />
                      <Stat label={t.burns.left} value={realCirculating.toLocaleString(loc)} unit={TOKEN.symbol} />
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-gold/20 bg-black/20 px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-gold/80" />
                      <span className="text-sm font-semibold text-gold">{t.burns.realStatus}</span>
                    </div>
                    <p className="mt-4 text-center text-xs text-cream/50">{realMinted ? t.burns.realNote : t.burns.realPending}</p>
                    <div className="mt-3 text-center">
                      {realMinted ? (
                        <a
                          href={solscanTokenOf(REAL)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold transition hover:text-amber"
                        >
                          {t.burns.verify} ↗
                        </a>
                      ) : REAL.wallet ? (
                        <a
                          href={solscanWalletOf(REAL)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-gold/80 transition hover:text-amber"
                        >
                          {`${REAL.wallet.slice(0, 4)}…${REAL.wallet.slice(-4)}`} ↗
                        </a>
                      ) : null}
                    </div>
                  </TiltCard>
                </Reveal>
              </Section>

              {/* PROOF */}
              <Section id="proof">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.proof.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.proof.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.proof.sub}</p>
                  </div>
                </Reveal>

                <Reveal>
                  <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    {/* Заголовок потока */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                      <h3 className="text-sm font-semibold text-cream/70">{t.proof.title}</h3>
                      <span className="flex items-center gap-1.5 text-xs text-cream/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                        {t.burns.live}
                      </span>
                    </div>
                    {/* Таблица */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-wider text-cream/30">
                            <th className="px-4 py-3 font-medium">{t.proof.colTime}</th>
                            <th className="px-4 py-3 font-medium">{t.proof.colEvent}</th>
                            <th className="px-4 py-3 font-medium">{t.proof.colSale}</th>
                            <th className="px-4 py-3 text-right font-medium">{t.proof.colAmount}</th>
                            <th className="px-4 py-3 text-center font-medium">{t.proof.colHash}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {burns === null ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-cream/40">
                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal/40 border-t-teal align-middle" />
                                {t.proof.loading}
                              </td>
                            </tr>
                          ) : burns.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-cream/40">
                                {t.proof.empty}
                              </td>
                            </tr>
                          ) : (
                            burns.map((b, i) => (
                              <BurnRow key={b.sig} burn={b} even={i % 2 === 0} locale={loc} eventLabel={t.proof.colEvent} />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Reveal>

                {compare && (compare.status === "warning" || compare.status === "error") && (
                  <Reveal>
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 px-5 py-4 text-sm text-amber">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      <div>
                        <p className="font-semibold">{t.proof.mismatchWarn}</p>
                        <p className="mt-1 text-xs text-amber/70">
                          {`POS: ${compare.pos_cups.toLocaleString(loc)} ${t.ui.cupsWord} · Solana: ${compare.solana_burns.toLocaleString(loc)} ${t.ui.burnedWord} · ${t.ui.diffWord} ${compare.mismatch.toLocaleString(loc)}`}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                )}

                {compare && compare.status === "perfect" && (
                  <Reveal>
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-teal/40 bg-teal/10 px-5 py-4 text-sm text-teal">
                      <span className="mt-0.5 shrink-0">✓</span>
                      <div>
                        <p className="font-semibold">{t.ui.inSyncTitle}</p>
                        <p className="mt-1 text-xs text-teal/70">
                          {`${compare.pos_cups.toLocaleString(loc)} ${t.ui.cupsWord} → ${compare.solana_burns.toLocaleString(loc)} ${t.ui.burnedWord} $DOFFA`}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                )}

                <div className="mt-20">
                  <Reveal>
                    <div className="text-center">
                      <Tag>{t.proof.trustTag}</Tag>
                      <h3 className="display mt-5 text-3xl font-bold text-cream-soft sm:text-4xl">{t.proof.trustTitle}</h3>
                      <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.proof.trustSub}</p>
                    </div>
                  </Reveal>

                  <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {t.proof.trustSteps.map((s, i) => (
                      <Reveal key={i} delay={i * 0.1}>
                        <div className="card h-full rounded-2xl p-7">
                          <div className="mb-4 text-4xl">{s.icon}</div>
                          <h4 className="display text-lg font-bold text-cream-soft">{s.t}</h4>
                          <p className="mt-3 text-sm leading-relaxed text-cream/70">{s.d}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>

                  <Reveal>
                    <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-cream/40">
                        {t.ui.dataFlow}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {[
                          { icon: "☕", label: t.ui.flowPaid },
                          { icon: "→", label: null },
                          { icon: "🧾", label: t.ui.flowReceipt },
                          { icon: "→", label: null },
                          { icon: "🔐", label: "receipt_hash" },
                          { icon: "→", label: null },
                          { icon: "⛓", label: t.ui.flowMemo },
                          { icon: "→", label: null },
                          { icon: "📊", label: t.ui.flowDashboard },
                        ].map((step, i) =>
                          step.label === null ? (
                            <span key={i} className="text-cream/30">{step.icon}</span>
                          ) : (
                            <span key={i} className="inline-flex flex-col items-center gap-1 rounded-xl border border-white/10 px-4 py-3 text-center">
                              <span className="text-xl">{step.icon}</span>
                              <span className="text-xs text-cream/60">{step.label}</span>
                            </span>
                          ),
                        )}
                      </div>
                      <p className="mt-4 text-xs text-cream/40">{t.ui.dataFlowNote}</p>
                    </div>
                  </Reveal>
                </div>
              </Section>

              {/* VERIFY */}
              <Section id="verify">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.verify.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.verify.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.verify.sub}</p>
                  </div>
                </Reveal>
                <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
                  <Reveal>
                    <VerifyCard
                      label={t.verify.mintLabel}
                      value={REAL.mint ?? ""}
                      href={solscanToken()}
                      cta={t.verify.viewToken}
                      copiedLabel={t.ui.copied}
                      copyLabel={t.ui.copy}
                    />
                  </Reveal>
                  <Reveal delay={0.08}>
                    <VerifyCard
                      label={t.verify.reserveLabel}
                      value={t.verify.reserveNote}
                      href={solscanHolders()}
                      cta={t.verify.viewHolders}
                      mono={false}
                      copiedLabel={t.ui.copied}
                      copyLabel={t.ui.copy}
                    />
                  </Reveal>
                  <Reveal delay={0.16}>
                    <VerifyCard
                      label={t.verify.clusterLabel}
                      value={t.verify.clusterVal}
                      mono={false}
                    />
                  </Reveal>
                </div>
              </Section>
            </motion.div>
          )}

          {/* TAB: CAFE */}
          {activeTab === "cafe" && (
            <motion.div key="cafe" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              {/* MENU */}
              <Section id="menu">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.menu.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.menu.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.menu.sub}</p>
                  </div>
                </Reveal>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                  {t.menu.groups.map((group, gi) => (
                    <Reveal key={group.title} delay={gi * 0.1}>
                      <div className="card h-full rounded-2xl p-6">
                        <h3 className="display mb-4 text-lg font-bold text-teal">{group.title}</h3>
                        <ul className="divide-y divide-white/[0.06]">
                          {group.items.map((item) => (
                            <li key={item.name} className="flex items-baseline justify-between gap-3 py-2.5">
                              <span className="text-sm text-cream/85">{item.name}</span>
                              {item.price && <span className="display shrink-0 text-sm font-bold text-gold">{item.price}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <Reveal>
                  <p className="mt-6 text-center text-sm text-cream/55">{t.menu.note}</p>
                </Reveal>
                <div className="relative mt-8 overflow-hidden rounded-3xl">
                  <Image src="/brand/cups-four.jpg" alt="Латте-арт DOFFA" width={1200} height={800} className="h-48 w-full object-cover object-center sm:h-72" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                </div>
              </Section>

              {/* GALLERY */}
              <Section id="gallery">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.gallery.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.gallery.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.gallery.sub}</p>
                  </div>
                </Reveal>
                <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {GALLERY.map((g, i) => (
                    <Reveal key={g.src} delay={(i % 3) * 0.08}>
                      <TiltCard max={4} className="group relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-white/10">
                        <Image
                          src={g.src}
                          alt={g.alt}
                          fill
                          sizes="(max-width:768px) 50vw, 33vw"
                          className="object-cover transition duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                      </TiltCard>
                    </Reveal>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* TAB: COMMUNITY */}
          {activeTab === "community" && (
            <motion.div key="community" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              {/* ROADMAP */}
              <Section id="roadmap">
                <Reveal>
                  <Tag>{t.roadmap.tag}</Tag>
                  <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.roadmap.title}</h2>
                </Reveal>
                <div className="relative mt-12">
                  {/* vertical line */}
                  <div className="absolute left-5 top-0 h-full w-0.5 bg-gradient-to-b from-gold/50 via-teal/30 to-transparent" />
                  <div className="space-y-8">
                    {t.roadmap.phases.map((p, i) => (
                      <Reveal key={p.n} delay={i * 0.1}>
                        <div className="relative flex gap-5">
                          {/* dot */}
                          <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${p.done ? "border-teal bg-teal/20" : "border-gold/60 bg-gold/10"}`}>
                            {p.done ? (
                              <span className="text-xs font-bold text-teal">✓</span>
                            ) : (
                              <span className="text-xs font-bold text-gold">{i + 1}</span>
                            )}
                          </div>
                          {/* card */}
                          <TiltCard max={3} className={`flex-1 rounded-2xl border p-5 ${p.done ? "border-teal/40 bg-teal/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gold/70">{p.n}</div>
                            <h3 className="display text-base font-bold text-cream-soft">{p.t}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-cream/65">{p.d}</p>
                            {p.done && (
                              <span className="mt-3 inline-block rounded-full bg-teal/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">
                                ✓ Done
                              </span>
                            )}
                          </TiltCard>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </Section>

              {/* FAQ */}
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
            </motion.div>
          )}

          {/* TAB: BUY */}
          {activeTab === "buy" && (
            <motion.div key="buy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Section id="buy">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                  <Reveal>
                    <Tag>{t.buy.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.buy.title}</h2>
                    <p className="mt-4 text-cream/70">{t.buy.sub}</p>
                    <div className="mt-7">
                      {wallet ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-4 py-2 text-sm font-semibold text-teal">
                              <span className="h-2 w-2 rounded-full bg-teal" />
                              {t.buy.connected}: {wallet.slice(0, 4)}…{wallet.slice(-4)}
                            </span>
                            <button onClick={disconnectWallet} className="text-xs text-cream/50 underline transition hover:text-cream">
                              {t.buy.disconnect}
                            </button>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
                            <div className="text-xs uppercase tracking-wider text-cream/50">{t.buy.balanceLabel}</div>
                            <div className="display mt-1 text-2xl font-extrabold text-cream-soft">
                              {walletBal === null ? "…" : walletBal.toLocaleString(loc)}{" "}
                              <span className="text-gold">{TOKEN.symbol}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setWalletModal(true)}
                          className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 font-bold text-ink transition hover:brightness-110"
                        >
                          {t.buy.connect}
                        </button>
                      )}
                      <p className="mt-3 max-w-md text-xs text-cream/50">{t.buy.walletNote}</p>
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
            </motion.div>
          )}

          {/* TAB: CONTACT */}
          {activeTab === "contact" && (
            <motion.div key="contact" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Section id="contact">
                <Reveal>
                  <div className="card rounded-3xl p-8 sm:p-12">
                    <div className="grid gap-10 lg:grid-cols-2">
                      <div>
                        <Tag>{t.contact.tag}</Tag>
                        <h2 className="display mt-5 text-4xl font-bold text-cream-soft">{t.contact.title}</h2>
                        <p className="mt-4 text-cream/70">{t.contact.sub}</p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <a
                            href={TOKEN.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-semibold text-gold transition hover:bg-gold hover:text-ink"
                          >
                            {t.contact.ig} {TOKEN.instagramHandle}
                          </a>
                          <a
                            href={CONTACT.whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-6 py-3 font-semibold text-teal transition hover:bg-teal hover:text-ink"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                      <div className="grid content-center gap-4">
                        <InfoRow k={t.contact.address} v={t.contact.addressVal} href={CONTACT.map} />
                        <InfoRow k={t.contact.phone} v={t.contact.phoneVal} href={`tel:${CONTACT.phoneTel}`} />
                        <InfoRow k={t.contact.hours} v={t.contact.hoursVal} />
                        <InfoRow k={t.contact.ig} v={TOKEN.instagramHandle} href={TOKEN.instagram} />
                      </div>
                    </div>
                  </div>
                </Reveal>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-28 sm:scroll-mt-20 px-5 py-24">
      {children}
    </section>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: React.ReactNode; unit?: string; accent?: boolean }) {
  return (
    <Reveal>
      <div className={`flex h-full flex-col rounded-2xl border p-6 text-center ${accent ? "border-amber/40 bg-amber/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
        <div className="display text-2xl font-extrabold leading-tight text-cream-soft tabular-nums sm:text-3xl">{value}</div>
        {unit && <div className="mt-1.5 text-sm font-semibold text-gold">{unit}</div>}
        <div className="mt-2 text-xs uppercase tracking-wider text-cream/50">{label}</div>
      </div>
    </Reveal>
  );
}

function BurnRow({ burn, even, locale = "ru-RU", eventLabel = "Burn" }: { burn: BurnRecord; even: boolean; locale?: string; eventLabel?: string }) {
  const date = burn.blockTime
    ? new Date(burn.blockTime * 1000).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";
  const shortSig = burn.sig ? burn.sig.slice(0, 4) + "…" + burn.sig.slice(-4) : "—";
  const saleLabel = burn.saleId ? `POS #${burn.saleId}` : "—";

  return (
    <tr className={`transition-colors hover:bg-white/[0.03] ${even ? "" : "bg-white/[0.015]"}`}>
      <td className="px-4 py-3 text-cream/50 tabular-nums">{date}</td>
      <td className="px-4 py-3 font-medium text-amber">🔥 {eventLabel}</td>
      <td className="px-4 py-3 text-cream/60">{saleLabel}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-cream/80">
        −{burn.amount > 0 ? burn.amount.toLocaleString(locale) : "?"} $DOFFA
      </td>
      <td className="px-4 py-3 text-center">
        <a
          href={solscanTx(burn.sig)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-cream/50 underline transition hover:text-teal"
          title={burn.sig}
        >
          {shortSig}
        </a>
      </td>
    </tr>
  );
}

function VerifyCard({
  label,
  value,
  href,
  cta,
  mono = true,
  copiedLabel = "✓ copied",
  copyLabel = "copy",
}: {
  label: string;
  value: string;
  href?: string;
  cta?: string;
  mono?: boolean;
  copiedLabel?: string;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const canCopy = mono;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard недоступен */
    }
  };
  return (
    <div className="card flex h-full flex-col rounded-2xl p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-cream/45">{label}</div>
      <div
        className={`mt-2 flex-1 break-all text-sm text-cream/80 ${mono ? "font-mono text-xs leading-relaxed" : ""}`}
      >
        {value}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal transition hover:text-gold"
          >
            {cta} ↗
          </a>
        )}
        {canCopy && (
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream/50 transition hover:text-cream"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ k, v, href, cta }: { k: string; v: string; href?: string; cta?: string }) {
  const external = href?.startsWith("http");
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <span className="shrink-0 text-sm text-cream/55">{k}</span>
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="display text-right text-sm font-bold text-cream-soft transition hover:text-gold"
        >
          {cta ?? v}
        </a>
      ) : (
        <span className="display text-right text-sm font-bold text-cream-soft">{v}</span>
      )}
    </div>
  );
}
