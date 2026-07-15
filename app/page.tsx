"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dict, LANGS, TOKEN, CONTACT, GALLERY, VIDEOS, type Lang } from "./content";
import { ECOSYSTEM } from "./config/ecosystem";
import { REAL, solscanToken, solscanTokenOf, solscanHolders, fetchBalance, connectWalletById, disconnectWalletById } from "./solana";
import { SmoothScroll, CursorGlow, MouseParallax, TiltCard, Magnetic, ScrollProgressBar } from "./cinematic";
import { ThemeToggle } from "./theme-toggle";
import { Assistant } from "./assistant";

// three.js + gsap — тяжёлые библиотеки, грузим отдельным чанком только в
// браузере и только когда компонент реально понадобится (см. hero3d.tsx).
const Hero3D = dynamic(() => import("./hero3d").then((m) => m.Hero3D), { ssr: false });

// Дефолтный ролик в hero, пока владелец кофейни не загрузил свои через /admin.
const DEFAULT_HERO_VIDEO = "/brand/hero.mp4";

// Reward Vault — выделенный запас $DOFFA на игровые награды (1% эмиссии).
const REWARD_VAULT = 1_000_000;
// Публичная игра — DOFFA Bean Duel. Ссылка на веб-версию берётся из
// централизованной конфигурации (env NEXT_PUBLIC_GAME_WEB_URL). Пока не задана —
// не показываем фальшивую ссылку, кнопка ведёт на /game со статусом.
const GAME_URL = ECOSYSTEM.game.webUrl;

// Локализованная подпись для вкладки «Прозрачность» (fallback — английский).
const TRANSPARENCY_LABEL: Partial<Record<Lang, string>> = {
  ru: "Прозрачность", en: "Transparency", ar: "الشفافية", tr: "Şeffaflık",
  es: "Transparencia", fr: "Transparence", de: "Transparenz", zh: "透明度",
  hi: "पारदर्शिता", pt: "Transparência", it: "Trasparenza", ja: "透明性",
};

/* ---------- helpers ---------- */

function Reveal({
  children,
  delay = 0,
  blur = true,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  blur?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32, scale: 0.98, filter: blur ? "blur(6px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Раскладка "bento" для галереи: часть плиток крупнее/шире остальных.
// Индекс берётся по модулю длины массива — раскладка не сломается,
// если фото в GALLERY когда-нибудь станет больше или меньше девяти.
const BENTO_SPANS = [
  "col-span-2 row-span-2",
  "col-span-2",
  "",
  "",
  "row-span-2",
  "",
  "",
  "col-span-2",
  "",
];

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
      {children}
    </span>
  );
}

// Иконки для карточек мерча: чехол для кружки, фартук, сумка для зёрен —
// в том же порядке, что и t.merch.items. Простые линейные иконки вместо
// фото товаров, которых пока не существует.
function MerchIcon({ index }: { index: number }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (index === 0) {
    return (
      <svg {...common}>
        <path d="M6 8h10v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
        <path d="M9 5.5c0-.9.7-1.5 1.5-1.5S12 4.6 12 5.5" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg {...common}>
        <path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4z" />
        <path d="M9 13v3a3 3 0 0 0 3 3 3 3 0 0 0 3-3v-3" />
        <path d="M10.5 4V2.5h3V4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "token" | "cafe" | "merch" | "community" | "buy" | "contact">("story");
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

  // Один «маячок» посещения за сессию браузера — для счётчика в админке.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("doffa_tracked")) return;
      sessionStorage.setItem("doffa_tracked", "1");
      fetch("/api/track", { method: "POST" }).catch(() => {});
    } catch {
      // sessionStorage может быть недоступен (приватный режим) — не критично
    }
  }, []);




  const loc = t.locale;

  // Направление письма и атрибут языка — для арабского (rtl) и доступности.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir ?? "ltr";
  }, [lang, t.dir]);


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
    { id: "merch",     label: t.tabs.merch },
    { id: "community", label: t.tabs.community },
    { id: "buy",       label: t.tabs.buy },
    { id: "contact",   label: t.tabs.contact },
  ];

  return (
    <main className="relative z-0">
      <SmoothScroll />
      <CursorGlow />
      <ScrollProgressBar />
      {/* ---------- NAV ---------- */}
      <header className="theme-pin-dark fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-5 sm:py-3">
          <a href="#top" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <Image src="/brand/doffa-logo.jpeg" alt="DOFFA" width={36} height={36} className="rounded-full ring-1 ring-gold/40 sm:w-[40px] sm:h-[40px]" />
            <span className="display text-base font-extrabold tracking-tight text-cream-soft sm:text-lg">
              DOFFA<span className="text-teal">.</span>
            </span>
          </a>
          <nav className="hidden flex-1 items-center justify-center gap-3 whitespace-nowrap px-4 xl:gap-4 lg:flex">
            {tabs.map((t) =>
              t.id === "merch" ? (
                <Link key={t.id} href="/merch" className="text-xs text-cream/70 transition hover:text-gold xl:text-sm">
                  {t.label}
                </Link>
              ) : (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`text-xs xl:text-sm transition ${
                    activeTab === t.id ? "font-semibold text-gold" : "text-cream/70 hover:text-gold"
                  }`}
                >
                  {t.label}
                </button>
              ),
            )}
            <Link href="/game" className="text-xs text-cream/70 transition hover:text-gold xl:text-sm">
              Bean Duel
            </Link>
            <Link href="/transparency" className="text-xs text-cream/70 transition hover:text-gold xl:text-sm">
              {TRANSPARENCY_LABEL[lang] ?? "Transparency"}
            </Link>
            <Link
              href="/download"
              className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold transition hover:bg-gold/20 xl:text-sm"
            >
              {t.tabs.download}
            </Link>
            <Link
              href="/profile"
              className="text-xs text-cream/70 transition hover:text-gold xl:text-sm"
            >
              {t.tabs.profile}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-2">
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
            <ThemeToggle />
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
              {tabs.map((t) =>
                t.id === "merch" ? (
                  <Link
                    key={t.id}
                    href="/merch"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-cream/75 transition hover:bg-white/5 hover:text-gold"
                  >
                    {t.label}
                  </Link>
                ) : (
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
                ),
              )}
              <Link
                href="/game"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-cream/75 transition hover:bg-white/5 hover:text-gold"
              >
                Bean Duel
              </Link>
              <Link
                href="/transparency"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-cream/75 transition hover:bg-white/5 hover:text-gold"
              >
                {TRANSPARENCY_LABEL[lang] ?? "Transparency"}
              </Link>
              <Link
                href="/download"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
              >
                {t.tabs.download} ↓
              </Link>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-cream/75 hover:bg-white/5 hover:text-gold"
              >
                {t.tabs.profile}
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* ---------- HERO ---------- */}
      <section id="top" className="theme-pin-dark relative flex min-h-screen items-end overflow-hidden sm:items-center">
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
            <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber text-glow">
              <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
              {t.hero.kicker}
            </p>
            <h1 className="display max-w-4xl text-6xl font-extrabold leading-[0.96] tracking-tight text-cream-soft sm:text-8xl">
              {t.hero.title1}
              <br />
              <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent text-glow">{t.hero.title2}</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream/80">{t.hero.sub}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-cream/75">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                📍 {t.ui.location}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                🕖 07:00–22:00
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Magnetic>
                <button onClick={() => setActiveTab("token")} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110">
                  {t.hero.ctaBuy}
                </button>
              </Magnetic>
              <Magnetic>
                <Link href="/merch" className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
                  {t.hero.ctaMenu}
                </Link>
              </Magnetic>
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
              <span>Tap · Duel · Claim</span><span className="text-teal">·</span>
              <span>Since 2021</span><span className="text-teal">·</span>
              <span>Solana SPL</span><span className="text-teal">·</span>
              <span>DOFFA Bean Duel</span><span className="text-teal">·</span>
              <span>Halal spirit</span><span className="text-teal">·</span>
              <span>DOFFA Games</span><span className="text-teal">·</span>
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

              {/* FLOW: Tap → Зёрна → Game → $DOFFA */}
              <Section id="flow">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.flow.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.flow.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.flow.sub}</p>
                  </div>
                </Reveal>
                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  {t.flow.steps.map((s, i) => (
                    <Reveal key={i} delay={i * 0.1}>
                      <div className="card h-full rounded-2xl p-6">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="text-3xl">{s.icon}</span>
                          <span className="display text-xl font-extrabold text-teal">0{i + 1}</span>
                        </div>
                        <h3 className="display text-lg font-bold text-cream-soft">{s.t}</h3>
                        <p className="mt-2 text-sm text-cream/70">{s.d}</p>
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
                                className="h-full rounded-full bg-gradient-to-r from-amber via-gold to-copper"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                </div>
              </Section>

              {/* REWARD VAULT */}
              <Section id="vault">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.flow.vaultTag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.flow.vaultTitle}</h2>
                  </div>
                </Reveal>

                <Reveal>
                  <TiltCard max={2.5} className="relative mt-10 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-gold/[0.08] via-copper/[0.03] to-transparent p-6 shadow-2xl shadow-gold/10 sm:p-8">
                    <div aria-hidden className="gold-line absolute inset-x-0 top-0 h-px" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-bold text-cream-soft">{t.flow.vaultTag} · mainnet</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gradient-to-r from-gold/20 to-copper/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
                        $DOFFA · SOLANA
                      </span>
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-3">
                      <Stat label={t.flow.vaultAmountLabel} value={REWARD_VAULT.toLocaleString(loc)} unit={TOKEN.symbol} accent />
                      <Stat label={t.flow.vaultSupplyLabel} value={REAL.initialSupply.toLocaleString(loc)} unit={TOKEN.symbol} />
                      <Stat label={t.flow.vaultShareLabel} value="1%" />
                    </div>
                    <p className="mt-6 text-center text-xs leading-relaxed text-cream/50">{t.flow.vaultNote}</p>
                    <div className="mt-3 text-center">
                      <a
                        href={solscanTokenOf(REAL)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold transition hover:text-amber"
                      >
                        {t.verify.viewToken} ↗
                      </a>
                    </div>
                  </TiltCard>
                </Reveal>

                {/* CLAIM */}
                <Reveal>
                  <div className="card mt-8 rounded-3xl p-8 text-center sm:p-10">
                    <h3 className="display text-2xl font-bold text-cream-soft sm:text-3xl">{t.flow.claimTitle}</h3>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-cream/70">{t.flow.claimNote}</p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                      <Magnetic>
                        {GAME_URL ? (
                          <a
                            href={GAME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
                          >
                            ⚔️ {t.flow.playCta}
                          </a>
                        ) : (
                          <Link
                            href="/game"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
                          >
                            ⚔️ {t.flow.playCta}
                          </Link>
                        )}
                      </Magnetic>
                      <Magnetic>
                        <Link
                          href="/game"
                          className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
                        >
                          {ECOSYSTEM.primaryGameName}
                        </Link>
                      </Magnetic>
                    </div>
                  </div>
                </Reveal>
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
                <div className="mt-10 grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[160px] sm:gap-4 md:grid-flow-dense md:auto-rows-[190px] md:grid-cols-4">
                  {GALLERY.map((g, i) => (
                    <Reveal key={g.src} delay={(i % 3) * 0.08} className={BENTO_SPANS[i % BENTO_SPANS.length]}>
                      <TiltCard max={4} className="group relative h-full overflow-hidden rounded-2xl ring-1 ring-white/10">
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

          {/* TAB: MERCH */}
          {activeTab === "merch" && (
            <motion.div key="merch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Section id="merch">
                <Reveal>
                  <div className="text-center">
                    <Tag>{t.merch.tag}</Tag>
                    <h2 className="display mt-5 text-4xl font-bold text-cream-soft sm:text-5xl">{t.merch.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-cream/70">{t.merch.sub}</p>
                  </div>
                </Reveal>
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                  {t.merch.items.map((item, i) => (
                    <Reveal key={item.name} delay={i * 0.1}>
                      <TiltCard max={5} className="card group relative flex h-full flex-col overflow-hidden rounded-2xl p-7">
                        <div
                          aria-hidden
                          className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-copper/30 bg-gradient-to-br from-copper/25 to-espresso-deep/40 text-copper transition group-hover:border-copper/60"
                        >
                          <MerchIcon index={i} />
                        </div>
                        <h3 className="display text-lg font-bold text-cream-soft">{item.name}</h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">{item.desc}</p>
                        <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full border border-copper/30 bg-copper/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-copper">
                          {t.merch.comingSoon}
                        </span>
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

      <Assistant t={t} onNavigate={setActiveTab} />
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
