"use client";

import { useState } from "react";
import { MERCH } from "../config/merch";

type Values = {
  name: string;
  contact: string;
  productType: string;
  quantity: string;
  personalization: string;
  persoText: string;
  idea: string;
  deadline: string;
  budget: string;
  location: string;
  consent: boolean;
  website: string; // honeypot
};

const EMPTY: Values = {
  name: "", contact: "", productType: "", quantity: "", personalization: "",
  persoText: "", idea: "", deadline: "", budget: "", location: "", consent: false, website: "",
};

const field =
  "mt-1.5 w-full rounded-xl border border-white/12 bg-ink/40 px-4 py-2.5 text-sm text-cream outline-none transition focus:border-gold/50";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-cream/45";

// Собираем читаемый текст заявки — для WhatsApp-фолбэка, когда онлайн-приём выключен.
function toMessage(v: Values): string {
  const lines = [
    "Заявка на кожаное изделие DOFFA",
    `Имя: ${v.name}`,
    `Связь: ${v.contact}`,
    v.productType && `Изделие: ${v.productType}`,
    v.quantity && `Количество: ${v.quantity}`,
    v.personalization && `Персонализация: ${v.personalization}`,
    v.persoText && `Текст/инициалы: ${v.persoText}`,
    v.idea && `Идея: ${v.idea}`,
    v.deadline && `Срок: ${v.deadline}`,
    v.budget && `Бюджет: ${v.budget}`,
    v.location && `Город/страна: ${v.location}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export default function MerchOrderForm() {
  const [v, setV] = useState<Values>(EMPTY);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.name.trim() || !v.contact.trim() || !v.consent) {
      setError("Заполни имя, способ связи и согласие на обработку данных.");
      return;
    }

    // Онлайн-приём выключен — не имитируем отправку, а открываем реальный канал
    // (WhatsApp) с уже заполненным текстом заявки.
    if (!MERCH.ordersEnabled) {
      const base = MERCH.contact.url;
      const sep = base.includes("?") ? "&" : "?";
      window.open(`${base}${sep}text=${encodeURIComponent(toMessage(v))}`, "_blank", "noopener,noreferrer");
      setDone(true);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/merch/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDone(true);
        setV(EMPTY);
      } else {
        setError(data.error ?? "Не удалось отправить заявку.");
      }
    } catch {
      setError("Ошибка сети. Попробуй ещё раз или напиши нам напрямую.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="card rounded-3xl p-8 text-center">
        <span className="text-4xl">🧵</span>
        <h3 className="display mt-3 text-xl font-bold text-cream-soft">Заявка принята</h3>
        <p className="mt-2 text-sm leading-relaxed text-cream/65">
          {MERCH.ordersEnabled
            ? "Мы получили заявку и свяжемся с тобой, чтобы уточнить детали."
            : "Мы открыли чат — отправь сообщение, и мы обсудим материал, макет, сроки и стоимость."}
        </p>
        <button
          onClick={() => { setDone(false); }}
          className="mt-6 rounded-full border border-cream/25 px-6 py-2.5 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold"
        >
          Оформить ещё одну
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card rounded-3xl p-6 sm:p-8" noValidate>
      {!MERCH.ordersEnabled && (
        <p className="mb-6 rounded-2xl border border-copper/25 bg-copper/10 px-4 py-3 text-xs leading-relaxed text-copper">
          Онлайн-приём заявок готовится. Заполни форму — и мы откроем чат в {MERCH.contact.label} с уже
          готовым текстом, чтобы ничего не потерялось.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Имя *</label>
          <input className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className={labelCls}>Способ связи *</label>
          <input className={field} value={v.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Телефон, Telegram или email" maxLength={200} required />
        </div>
        <div>
          <label className={labelCls}>Тип изделия</label>
          <select className={field} value={v.productType} onChange={(e) => set("productType", e.target.value)}>
            <option value="">— выбери —</option>
            {MERCH.productTypes.map((p) => <option key={p} value={p} className="bg-ink text-cream">{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Количество</label>
          <input className={field} value={v.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="1 шт., 10, тираж…" maxLength={60} />
        </div>
        <div>
          <label className={labelCls}>Нужна ли персонализация</label>
          <select className={field} value={v.personalization} onChange={(e) => set("personalization", e.target.value)}>
            <option value="">— выбери —</option>
            <option value="Да" className="bg-ink text-cream">Да</option>
            <option value="Нет" className="bg-ink text-cream">Нет</option>
            <option value="Уточню" className="bg-ink text-cream">Уточню при обсуждении</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Текст или инициалы</label>
          <input className={field} value={v.persoText} onChange={(e) => set("persoText", e.target.value)} placeholder="Например: A.K. или надпись" maxLength={200} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Описание идеи</label>
          <textarea className={`${field} min-h-24 resize-y`} value={v.idea} onChange={(e) => set("idea", e.target.value)} placeholder="Что хотите изготовить, референс, логотип, пожелания…" maxLength={2000} />
        </div>
        <div>
          <label className={labelCls}>Желаемый срок</label>
          <input className={field} value={v.deadline} onChange={(e) => set("deadline", e.target.value)} placeholder="Например: к концу месяца" maxLength={120} />
        </div>
        <div>
          <label className={labelCls}>Ориентировочный бюджет</label>
          <input className={field} value={v.budget} onChange={(e) => set("budget", e.target.value)} maxLength={120} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Город или страна</label>
          <input className={field} value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={120} />
        </div>
      </div>

      {/* honeypot — скрыт от людей, видят только боты */}
      <input
        type="text" tabIndex={-1} autoComplete="off" value={v.website}
        onChange={(e) => set("website", e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden
      />

      <label className="mt-6 flex items-start gap-3 text-xs leading-relaxed text-cream/60">
        <input type="checkbox" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" required />
        <span>Согласен(а) на обработку указанных данных для связи по заказу.</span>
      </label>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3.5 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110 disabled:opacity-50"
      >
        {sending ? "Отправляю…" : MERCH.ordersEnabled ? "Отправить заявку" : `Продолжить в ${MERCH.contact.label}`}
      </button>
      <p className="mt-3 text-center text-[11px] text-cream/35">
        {MERCH.contact.label} для быстрой связи — ответим и подскажем по материалу и срокам.
      </p>
    </form>
  );
}
