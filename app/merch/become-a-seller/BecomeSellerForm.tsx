"use client";

import { useState } from "react";
import { MERCH, MERCH_FLAGS } from "../../config/merch";

type Values = {
  name: string;
  shopName: string;
  email: string;
  contact: string;
  location: string;
  productsDesc: string;
  links: string;
  shipping: string;
  acceptsFiat: boolean;
  wantsDoffa: boolean;
  agreeRules: boolean;
  confirmRights: boolean;
  website: string; // honeypot
};

const EMPTY: Values = {
  name: "", shopName: "", email: "", contact: "", location: "", productsDesc: "",
  links: "", shipping: "", acceptsFiat: false, wantsDoffa: false,
  agreeRules: false, confirmRights: false, website: "",
};

const field = "mt-1.5 w-full rounded-xl border border-white/12 bg-ink/40 px-4 py-2.5 text-sm text-cream outline-none transition focus:border-gold/50";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-cream/45";

function toMessage(v: Values): string {
  return [
    "Заявка на подключение продавца · DOFFA Marketplace",
    `Имя: ${v.name}`,
    `Магазин: ${v.shopName}`,
    `Email: ${v.email}`,
    v.contact && `Связь: ${v.contact}`,
    v.location && `Регион: ${v.location}`,
    v.productsDesc && `Товары: ${v.productsDesc}`,
    v.links && `Ссылки: ${v.links}`,
    v.shipping && `Доставка: ${v.shipping}`,
    `Обычная оплата: ${v.acceptsFiat ? "да" : "нет"}`,
    `Хочет принимать DOFFA: ${v.wantsDoffa ? "да" : "нет"}`,
  ].filter(Boolean).join("\n");
}

export default function BecomeSellerForm() {
  const [v, setV] = useState<Values>(EMPTY);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.name.trim() || !v.shopName.trim() || !v.email.trim() || !v.agreeRules || !v.confirmRights) {
      setError("Заполни имя, магазин, email и оба согласия.");
      return;
    }
    // Портал продавца ещё подключается — не имитируем успешную регистрацию.
    // Открываем реальный канал связи с уже готовым текстом заявки.
    const base = MERCH.contact.url;
    const sep = base.includes("?") ? "&" : "?";
    window.open(`${base}${sep}text=${encodeURIComponent(toMessage(v))}`, "_blank", "noopener,noreferrer");
    setDone(true);
  }

  if (done) {
    return (
      <div className="card rounded-3xl p-8 text-center">
        <h3 className="display text-xl font-bold text-cream-soft">Заявка подготовлена</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/65">
          Мы открыли чат в {MERCH.contact.label} с готовым текстом заявки — отправь сообщение,
          и мы подключим тебя как продавца после проверки. Публиковать товары можно только после одобрения.
        </p>
        <button onClick={() => setDone(false)} className="mt-6 rounded-full border border-cream/25 px-6 py-2.5 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold">
          Заполнить ещё раз
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card rounded-3xl p-6 sm:p-8" noValidate>
      {!MERCH_FLAGS.sellerPortalEnabled && (
        <p className="mb-6 rounded-2xl border border-copper/25 bg-copper/10 px-4 py-3 text-xs leading-relaxed text-copper">
          Кабинет продавца готовится. Заполни заявку — мы откроем чат в {MERCH.contact.label} с готовым
          текстом, рассмотрим и подключим тебя вручную. Фальшивой регистрации нет.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Имя *</label>
          <input className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className={labelCls}>Название магазина *</label>
          <input className={field} value={v.shopName} onChange={(e) => set("shopName", e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input type="email" autoComplete="email" className={field} value={v.email} onChange={(e) => set("email", e.target.value)} maxLength={200} required />
        </div>
        <div>
          <label className={labelCls}>Телефон или Telegram</label>
          <input className={field} value={v.contact} onChange={(e) => set("contact", e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className={labelCls}>Страна и город</label>
          <input className={field} value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={160} />
        </div>
        <div>
          <label className={labelCls}>Способы доставки</label>
          <input className={field} value={v.shipping} onChange={(e) => set("shipping", e.target.value)} placeholder="Почта, СДЭК, самовывоз…" maxLength={200} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Описание товаров</label>
          <textarea className={`${field} min-h-24 resize-y`} value={v.productsDesc} onChange={(e) => set("productsDesc", e.target.value)} placeholder="Что продаёте, из чего, для кого" maxLength={2000} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Ссылки на соцсети или сайт</label>
          <input className={field} value={v.links} onChange={(e) => set("links", e.target.value)} placeholder="Instagram, сайт, портфолио" maxLength={400} />
        </div>
      </div>

      {/* honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={v.website} onChange={(e) => set("website", e.target.value)} className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-3 text-xs leading-relaxed text-cream/60">
          <input type="checkbox" checked={v.acceptsFiat} onChange={(e) => set("acceptsFiat", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" />
          <span>Готов принимать обычную оплату (карта/перевод).</span>
        </label>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-cream/60">
          <input type="checkbox" checked={v.wantsDoffa} onChange={(e) => set("wantsDoffa", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" />
          <span>Хочу принимать оплату в DOFFA (дополнительно, где доступно).</span>
        </label>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-cream/60">
          <input type="checkbox" checked={v.agreeRules} onChange={(e) => set("agreeRules", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" required />
          <span>Согласен(а) с правилами продавца площадки.</span>
        </label>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-cream/60">
          <input type="checkbox" checked={v.confirmRights} onChange={(e) => set("confirmRights", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" required />
          <span>Подтверждаю права на товары и используемую символику.</span>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button type="submit" className="mt-6 w-full rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3.5 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110">
        Продолжить в {MERCH.contact.label}
      </button>
      <p className="mt-3 text-center text-[11px] text-cream/35">
        Товары можно публиковать только после проверки и одобрения.
      </p>
    </form>
  );
}
