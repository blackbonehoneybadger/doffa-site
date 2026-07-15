import type { Metadata } from "next";
import Link from "next/link";
import { MARKETPLACE, MERCH_FLAGS, MARKETPLACE_FAQ, MERCH } from "../config/merch";
import { CONTACT } from "../content";

export const metadata: Metadata = {
  title: "DOFFA Merch — фирменные товары и изделия на заказ",
  description:
    "DOFFA Marketplace: готовый мерч от DOFFA и проверенных партнёров, индивидуальные изделия из кожи с логотипом, именем или собственным дизайном. Оплата обычными способами и, где разрешено продавцом, в DOFFA.",
  alternates: { canonical: "/merch" },
  openGraph: {
    title: "DOFFA Merch — фирменные товары и изделия на заказ",
    description:
      "Готовый мерч, изделия из кожи на заказ и возможность стать продавцом на площадке DOFFA.",
    url: "/merch",
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA Merch" }],
  },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber">
      <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
      {children}
    </p>
  );
}

// SVG-иконки направлений (не emoji — стабильный рендер, темизация, дизайн-токены).
function IconBag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-7 w-7 text-gold" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}
function IconLeather() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-7 w-7 text-gold" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 9h16M9 5v14" strokeLinecap="round" />
    </svg>
  );
}
function IconSeller() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-7 w-7 text-gold" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16l-1 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0L4 7Z" strokeLinejoin="round" />
      <path d="M5 12v7h14v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DIRECTIONS = [
  {
    icon: <IconBag />, title: "Готовые товары", href: "#catalog",
    desc: "Фирменные изделия DOFFA и товары проверенных партнёров.",
    cta: "Смотреть товары",
  },
  {
    icon: <IconLeather />, title: "Изделия из кожи на заказ", href: "/merch/custom-leather",
    desc: "Индивидуальная ручная работа с логотипом, монограммой, именем или собственным дизайном.",
    cta: "Заказать изделие",
  },
  {
    icon: <IconSeller />, title: "Стать продавцом", href: "/merch/become-a-seller",
    desc: "Предложите собственные брендированные товары аудитории DOFFA.",
    cta: "Подать заявку",
  },
];

const LEGAL_LINKS = [
  { href: "/legal/merch", label: "Правила площадки" },
  { href: "/legal/sellers", label: "Условия для продавцов" },
  { href: "/legal/returns", label: "Возвраты" },
  { href: "/legal/payments", label: "Оплата" },
];

export default function MerchPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-28">
      {/* ---------- HERO ---------- */}
      <section>
        <Kicker>{MARKETPLACE.name} · {MARKETPLACE.subtitle}</Kicker>
        <h1 className="display mt-5 text-4xl font-extrabold leading-[1.02] tracking-tight text-cream-soft sm:text-6xl">
          Фирменные товары и{" "}
          <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
            изделия на заказ
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
          Готовый мерч от DOFFA и проверенных партнёров, а также индивидуальные изделия из кожи
          с логотипом, именем, монограммой или собственным дизайном.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#catalog" className="rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110">
            Смотреть товары
          </a>
          <Link href="/merch/custom-leather" className="rounded-full border border-cream/25 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
            Заказать изделие из кожи
          </Link>
          <Link href="/merch/become-a-seller" className="rounded-full border border-cream/15 px-7 py-3 font-semibold text-cream/70 transition hover:border-teal hover:text-teal">
            Стать продавцом
          </Link>
        </div>
      </section>

      {/* ---------- ТРИ НАПРАВЛЕНИЯ ---------- */}
      <section className="mt-20 grid gap-6 lg:grid-cols-3">
        {DIRECTIONS.map((d) => {
          const inner = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/5">{d.icon}</span>
              <h2 className="display mt-5 text-2xl font-bold text-cream-soft">{d.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">{d.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-gold group-hover:underline">{d.cta} →</span>
            </>
          );
          return d.href.startsWith("#") ? (
            <a key={d.title} href={d.href} className="card group flex flex-col rounded-3xl p-8 transition hover:border-gold/40">{inner}</a>
          ) : (
            <Link key={d.title} href={d.href} className="card group flex flex-col rounded-3xl p-8 transition hover:border-gold/40">{inner}</Link>
          );
        })}
      </section>

      {/* ---------- КАТАЛОГ ---------- */}
      <section id="catalog" className="mt-24 scroll-mt-24">
        <Kicker>Каталог</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Готовые товары</h2>
        {MERCH_FLAGS.catalogEnabled ? (
          // Каталог включён — карточки товаров подтягиваются из БД (реализуется на
          // следующем этапе). Пустых категорий не показываем.
          <p className="mt-4 text-sm text-cream/55">Загрузка каталога…</p>
        ) : (
          <div className="card mt-8 rounded-3xl p-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <IconBag />
            </span>
            <h3 className="display mt-5 text-xl font-bold text-cream-soft">Товары появятся после публикации продавцами</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cream/60">
              Каталог наполняется проверенными продавцами. Мы не выкладываем выдуманные товары и
              фотографии — пока витрина пуста, здесь честный пустой экран.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/merch/become-a-seller" className="rounded-full bg-gradient-to-r from-gold to-copper px-6 py-2.5 text-sm font-bold text-ink transition hover:brightness-110">
                Стать продавцом
              </Link>
              <Link href="/merch/custom-leather" className="rounded-full border border-cream/25 px-6 py-2.5 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold">
                Заказать изделие из кожи
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ---------- КОЖА НА ЗАКАЗ (краткий блок → отдельная страница) ---------- */}
      <section className="mt-24">
        <Kicker>Ручная работа</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Изделия из кожи на заказ</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/60">
          Кардхолдеры, кошельки, обложки, ремни, корпоративные подарки и лимитированные серии DOFFA.
          Логотип, монограмма, имя или собственный дизайн. Доступность материала и способа нанесения
          подтверждается после изучения заказа.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {MERCH.categories.slice(0, 8).map((c) => (
            <span key={c.id} className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-cream/75">{c.name}</span>
          ))}
          <span className="rounded-full border border-white/8 px-4 py-2 text-sm text-cream/40">и другое</span>
        </div>
        <Link href="/merch/custom-leather" className="mt-8 inline-block rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink transition hover:brightness-110">
          Перейти к заказу изделия
        </Link>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mt-24">
        <Kicker>Вопросы</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Частые вопросы</h2>
        <div className="mt-8 space-y-3">
          {MARKETPLACE_FAQ.map((f) => (
            <details key={f.q} className="card group rounded-2xl p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-cream-soft">
                {f.q}
                <span aria-hidden className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-cream/65">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- ЮРИДИЧЕСКОЕ ---------- */}
      <section className="mt-16">
        <div className="flex flex-wrap gap-4 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-cream/55 underline-offset-4 transition hover:text-gold hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- КОНТАКТ / НАВИГАЦИЯ ---------- */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">← На главную doffa.coffee</Link>
        <div className="flex gap-4 text-sm">
          <a href={MERCH.contact.url} target="_blank" rel="noopener noreferrer" className="text-cream/60 transition hover:text-teal">{MERCH.contact.label}</a>
          <a href={MERCH.contact.instagram} target="_blank" rel="noopener noreferrer" className="text-cream/60 transition hover:text-teal">Instagram</a>
          <a href={CONTACT.map} target="_blank" rel="noopener noreferrer" className="text-cream/60 transition hover:text-teal">Кофейня на карте</a>
        </div>
      </div>
    </main>
  );
}
