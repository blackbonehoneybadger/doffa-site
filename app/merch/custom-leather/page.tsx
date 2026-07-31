import type { Metadata } from "next";
import Link from "next/link";
import { MERCH, MERCH_STATUS_LABEL, PRICE_ON_REQUEST } from "../../config/merch";
import MerchOrderForm from "../MerchOrderForm";

export const metadata: Metadata = {
  title: "Изделия из кожи на заказ — DOFFA Merch",
  description:
    "Индивидуальные изделия из кожи с логотипом, монограммой, именем или собственным дизайном. Кардхолдеры, кошельки, обложки, ремни, корпоративные подарки. Цена рассчитывается индивидуально.",
  alternates: { canonical: "/merch/custom-leather" },
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

export default function CustomLeatherPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-28">
      {/* HERO */}
      <section>
        <Kicker>DOFFA · Custom Leather</Kicker>
        <h1 className="display mt-5 text-4xl font-extrabold leading-[1.02] tracking-tight text-cream-soft sm:text-6xl">
          Брендированные изделия из кожи{" "}
          <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">на заказ</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
          Клиент может заказать индивидуальное изделие из кожи для себя, в подарок, для компании или
          мероприятия. Нанесём логотип, монограмму, имя или собственный дизайн.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-cream/50">
          Доступность материала и способа нанесения подтверждается после изучения заказа.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#order" className="rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110">
            Заказать изделие
          </a>
          <a href={MERCH.contact.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-cream/25 px-7 py-3 font-semibold text-cream transition hover:border-teal hover:text-teal">
            Обсудить в {MERCH.contact.label}
          </a>
        </div>
      </section>

      {/* КАТЕГОРИИ */}
      <section id="catalog" className="mt-24 scroll-mt-24">
        <Kicker>Категории</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Что делаем из кожи</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/55">
          Реальные фото изделий добавляются по мере готовности — ниже категории и возможная персонализация.
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

      {/* ПЕРСОНАЛИЗАЦИЯ */}
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

      {/* ПРОЦЕСС */}
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

      {/* ФОРМА */}
      <section id="order" className="mt-24 scroll-mt-24">
        <Kicker>Индивидуальный заказ</Kicker>
        <h2 className="display mt-4 text-3xl font-extrabold text-cream-soft sm:text-4xl">Заказать изделие</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/55">
          {PRICE_ON_REQUEST}: стоимость зависит от материала, размера, персонализации и количества.
        </p>
        <div className="mt-8"><MerchOrderForm /></div>
      </section>

      {/* КОРПОРАТИВ */}
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

      {/* КОЛЛЕКЦИЯ DOFFA */}
      <section className="mt-24">
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

      {/* ЮРИДИЧЕСКОЕ */}
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

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <Link href="/merch" className="text-sm font-semibold text-gold transition hover:text-amber">← DOFFA Merch</Link>
        <Link href="/legal/merch" className="text-sm text-cream/55 transition hover:text-gold">Правила площадки</Link>
      </div>
    </main>
  );
}
