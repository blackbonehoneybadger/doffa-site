"use client";

// Плавающий виджет-помощник. Он честно не претендует на роль "настоящего"
// LLM-чата (для этого понадобился бы отдельный API-ключ и бэкенд) — вместо
// этого это умный поиск по уже переведённому FAQ (t.faq.items) плюс кнопки
// быстрого перехода к нужному разделу. Работает одинаково на всех 12 языках,
// потому что не заводит никакого нового текста — только читает существующий
// словарь t, который уже передаётся в page.tsx.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Dict } from "./content";

type TabId = "story" | "token" | "cafe" | "community" | "buy" | "contact";

export function Assistant({ t, onNavigate }: { t: Dict; onNavigate: (tab: TabId) => void }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [query, setQuery] = useState("");

  const chips: { label: string; tab: TabId }[] = [
    { label: t.tabs.cafe, tab: "cafe" },
    { label: t.tabs.token, tab: "token" },
    { label: t.contact.hours, tab: "contact" },
    { label: t.contact.address, tab: "contact" },
  ];

  const matches = query.trim()
    ? t.faq.items.filter(
        (item) =>
          item.q.toLowerCase().includes(query.trim().toLowerCase()) ||
          item.a.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  function toggle() {
    setOpen((v) => !v);
    setSeen(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="card flex max-h-[70vh] w-[90vw] max-w-sm flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="display text-sm font-bold text-cream-soft">{t.faq.tag}</p>
              <button onClick={() => setOpen(false)} aria-label="Закрыть" className="text-cream/50 transition hover:text-gold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-sm text-cream/70">{t.faq.title}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <button
                    key={`${c.tab}-${i}`}
                    onClick={() => {
                      onNavigate(c.tab);
                      setOpen(false);
                    }}
                    className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold hover:text-ink"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.faq.title}
                className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none transition placeholder:text-cream/40 focus:border-gold/50"
              />

              {query.trim() && (
                <div className="mt-3 space-y-2">
                  {matches.length > 0 ? (
                    matches.slice(0, 4).map((m, i) => (
                      <div key={i} className="rounded-lg bg-white/[0.03] p-3">
                        <p className="text-xs font-semibold text-cream-soft">{m.q}</p>
                        <p className="mt-1 text-xs text-cream/65">{m.a}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-white/[0.03] p-3 text-xs text-cream/55">
                      {t.contact.address}: {t.contact.addressVal} · {t.contact.phone}: {t.contact.phoneVal}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        aria-label={t.faq.tag}
        className="theme-pin-dark relative flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-lg shadow-gold/20 transition hover:brightness-110"
      >
        {!seen && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-teal glow-pulse" />}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
