import type { Metadata } from "next";
import Link from "next/link";
import BecomeSellerForm from "./BecomeSellerForm";

export const metadata: Metadata = {
  title: "Стать продавцом — DOFFA Merch",
  description:
    "Подайте заявку на подключение продавца DOFFA Marketplace. После проверки и одобрения вы сможете публиковать собственные брендированные товары.",
  alternates: { canonical: "/merch/become-a-seller" },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber">
      <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
      {children}
    </p>
  );
}

const STEPS = [
  { n: "01", t: "Заявка", d: "Заполните форму — она получает статус «На проверке»." },
  { n: "02", t: "Проверка", d: "Мы проверяем магазин, товары и права на символику." },
  { n: "03", t: "Одобрение", d: "После одобрения открывается кабинет продавца." },
  { n: "04", t: "Публикация", d: "Товары публикуются только после модерации." },
];

export default function BecomeSellerPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-28 pt-28">
      <Kicker>DOFFA Marketplace · Продавцам</Kicker>
      <h1 className="display mt-5 text-4xl font-extrabold leading-[1.02] tracking-tight text-cream-soft sm:text-5xl">
        Стать{" "}
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">продавцом</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Предложите собственные брендированные товары аудитории DOFFA. Публиковать товары можно только
        после проверки и одобрения — фальшивой мгновенной регистрации нет.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card rounded-2xl p-5">
            <span className="display text-2xl font-extrabold text-gold/70">{s.n}</span>
            <h3 className="display mt-2 text-base font-bold text-cream-soft">{s.t}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-cream/60">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12"><BecomeSellerForm /></div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/merch" className="text-sm font-semibold text-gold transition hover:text-amber">← DOFFA Merch</Link>
        <Link href="/legal/sellers" className="text-sm text-cream/55 transition hover:text-gold">Условия для продавцов</Link>
      </div>
    </main>
  );
}
