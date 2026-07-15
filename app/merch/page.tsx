import type { Metadata } from "next";
import Link from "next/link";
import { MERCH, MERCH_STATUS_LABEL, PRICE_ON_REQUEST } from "../config/merch";
import { CONTACT } from "../content";
import MerchOrderForm from "./MerchOrderForm";

export const metadata: Metadata = {
  title: "Брендированные изделия из кожи на заказ — DOFFA",
  description:
    "Кардхолдеры, кошельки, обложки, брелоки и корпоративные подарки из кожи. Логотипы, инициалы, тиснение и индивидуальный дизайн от DOFFA.",
  alternates: { canonical: "/merch" },
  openGraph: {
    title: "Мерч DOFFA и изделия из кожи на заказ",
    description:
      "Фирменные аксессуары, подарки и небольшие серии из натуральной кожи. Логотип, монограмма, имя или индивидуальный дизайн.",
    url: "/merch",
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA — изделия из кожи на заказ" }],
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

function StatusBadge({ status }: { status: keyof typeof MERCH_STATUS_LABEL }) {
  const tone =
    status === "live" ? "border-teal/40 bg-teal/10 text-teal"
    : status === "preorder" ? "border-gold/40 bg-gold/10 text-gold"
    : "border-copper/30 bg-copper/10 text-copper";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>
      {MERCH_STATUS_LABEL[status]}
    </span>
  );
}

export default function MerchPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-28">
      {/* ---------- HERO ---------- */}
      <section>
        <Kicker>DOFFA · LEATHER & MERCH</Kicker>
        <h1 className="display mt-5 text-4xl font-extrabold leading-[1.02] tracking-tight text-cream-soft sm:text-6xl">
          Мерч DOFFA и{" "}
          <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
            изделия из кожи
          </span>{" "}
          на заказ
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
          Фирменные аксессуары, подарки и небольшие серии из натуральной кожи. Нанесём логотип,
          монограмму, имя или индивидуальный дизайн — под человека, бренд, компанию или мероприятие.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#catalog" className="rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110">
            Смотреть изделия
          </a>
          <a href="#order" className="rounded-full border border-cream/25 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
            Заказать свой дизайн
          </a>
          <a href={MERCH.contact.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-cream/15 px-7 py-3 font-semibold text-cream/70 transition hover:border-teal hover:text-teal">
            Обсудить заказ
          </a>
        </div>
      </section>

      {/* ---------- ДВА НАПРАВЛЕНИЯ ---------- */}
      <section className="mt-20 grid gap-6 sm:grid-cols-2">
        <a href="#collection" className="card group rounded-3xl p-8 transition hover:border-gold/40">
          <span className="text-3xl">🃏</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Коллекция DOFFA</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/65">
            Фирменные изделия экосистемы DOFFA — с эмблемой, маскотом-чашкой и горной символикой.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-gold group-hover:underline">Смотреть коллекцию →</span>
        </a>
        <a href="#catalog" className="card group rounded-3xl p-8 transition hover:border-gold/40">
          <span className="text-3xl">🧵</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Кожаные изделия на заказ</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/65">
            Создаём кожаные изделия на заказ и адаптируем дизайн под человека, бренд, компанию или событие.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-gold group-hover:underline">Выбрать категорию →</span>
        </a>
      </section>

      {/* ---------- КАТАЛОГ КАТЕГОРИЙ ---------- */}
      <section id="catalog" className="mt-24 scroll-mt-24">
        <Kicker>Категории</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Что делаем из кожи</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/55">
          Изображения товаров ещё готовятся — ниже показаны категории и возможная персонализация.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MERCH.categories.map((c) => (
            <div key={c.id} className="card flex flex-col rounded-2xl p-6">
              <div aria-hidden className="mb-4 flex h-28 items-center justify-center rounded-xl border border-white/8 bg-gradient-to-br from-espresso/25 to-ink/40 text-[11px] uppercase tracking-widest text-cream/30">
                пример категории
              </div>
              <h3 className="display text-lg font-bold text-cream-soft">{c.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-cream/60">{c.desc}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-cream/35">{c.perso}</p>
              <a href="#order" className="mt-4 inline-block w-fit rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/20">
                Заказать
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ПЕРСОНАЛИЗАЦИЯ ---------- */}
      <section className="mt-24">
        <Kicker>Персонализация</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Сделаем под ваш бренд или идею</h2>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {MERCH.personalization.map((p) => (
            <span key={p} className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-cream/75">{p}</span>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-sm text-cream/50">
          Доступность конкретной технологии зависит от изделия, материала и сложности макета — уточняется при согласовании.
        </p>
      </section>

      {/* ---------- ПРОЦЕСС ЗАКАЗА ---------- */}
      <section className="mt-24">
        <Kicker>Как заказать</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Пять простых шагов</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {MERCH.steps.map((s) => (
            <div key={s.n} className="card rounded-2xl p-5">
              <span className="display text-2xl font-extrabold text-gold/70">{s.n}</span>
              <h3 className="display mt-2 text-base font-bold text-cream-soft">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ФОРМА ЗАКАЗА ---------- */}
      <section id="order" className="mt-24 scroll-mt-24">
        <Kicker>Индивидуальный заказ</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Заказать изделие</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/55">
          {PRICE_ON_REQUEST}: стоимость зависит от материала, размера, персонализации и количества.
        </p>
        <div className="mt-8">
          <MerchOrderForm />
        </div>
      </section>

      {/* ---------- КОРПОРАТИВНЫЕ ЗАКАЗЫ ---------- */}
      <section className="mt-24">
        <Kicker>Для бизнеса</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Для компаний и мероприятий</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {MERCH.corporate.map((c) => (
            <div key={c} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-cream/75">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {c}
            </div>
          ))}
        </div>
        <a href={MERCH.contact.url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-block rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink transition hover:brightness-110">
          Обсудить корпоративный заказ
        </a>
      </section>

      {/* ---------- КОЛЛЕКЦИЯ DOFFA ---------- */}
      <section id="collection" className="mt-24 scroll-mt-24">
        <Kicker>Коллекция DOFFA</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Фирменные изделия</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/55">
          Пока ни одна позиция не запущена в производство — показываем честный статус каждой.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MERCH.collection.map((item) => (
            <div key={item.name} className="card flex flex-col rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="display text-lg font-bold text-cream-soft">{item.name}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/60">{item.desc}</p>
              <a href="#order" className="mt-4 inline-block w-fit text-xs font-semibold text-gold hover:underline">Предзаказать / узнать →</a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mt-24">
        <Kicker>Вопросы</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Частые вопросы</h2>
        <div className="mt-8 space-y-3">
          {MERCH.faq.map((f) => (
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
      <section className="mt-20">
        <div className="card rounded-3xl p-8">
          <h2 className="display text-lg font-bold text-cream-soft">Условия индивидуального заказа</h2>
          <ul className="mt-4 space-y-3">
            {MERCH.legal.map((l, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-cream/55">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cream/40" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- КОНТАКТ / НАВИГАЦИЯ ---------- */}
      <div className="mt-16 flex flex-wrap items-center justify-between gap-4">
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
