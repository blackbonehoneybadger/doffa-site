"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReferralReward } from "../lib/rewards";

type AccountData = {
  user: {
    username: string;
    role: string;
    referralCode: string;
    referralCount: number;
    createdAt: number;
  };
  referralLink: string;
  referrals: string[];
  rewards: {
    unlocked: ReferralReward[];
    next: ReferralReward | null;
  };
};

type SearchHit = { username: string; referralCount: number; createdAt: number };

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) {
          router.replace("/login?next=/account");
          return;
        }
        setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить кабинет");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/account?q=${encodeURIComponent(query.trim())}`);
      const d = await res.json();
      if (d.ok) setHits(d.results ?? []);
      else setHits([]);
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
        <p className="text-cream/50">Загружаю кабинет…</p>
      </main>
    );
  }

  const { user, referralLink, referrals, rewards } = data;
  const nextAt = rewards.next?.at ?? null;
  const progress =
    nextAt && nextAt > 0
      ? Math.min(100, Math.round((user.referralCount / nextAt) * 100))
      : 100;

  return (
    <main className="relative mx-auto min-h-screen max-w-2xl px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(197,164,110,0.16),_transparent_65%)]"
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber">DOFFA · CABINET</p>
          <h1 className="display mt-2 text-3xl font-extrabold text-cream-soft sm:text-4xl">
            Привет, {user.username}
          </h1>
          <p className="mt-2 text-sm text-cream/55">
            Делись ссылкой — копи бонусы в кофейне и в игре.
          </p>
        </div>
        <button
          onClick={logout}
          className="shrink-0 text-xs text-cream/45 underline hover:text-cream"
        >
          Выйти
        </button>
      </div>

      {/* Referral link */}
      <section className="mt-10">
        <h2 className="display text-xl font-bold text-cream-soft">Твоя реферальная ссылка</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            value={referralLink}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-sm text-cream-soft outline-none"
          />
          <button
            onClick={copyLink}
            className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink transition hover:brightness-110"
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
        <p className="mt-2 text-xs text-cream/40">
          Код: <span className="font-mono tracking-wider text-gold">{user.referralCode}</span>
        </p>
      </section>

      {/* Progress */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="display text-xl font-bold text-cream-soft">Рефералы</h2>
          <p className="text-2xl font-extrabold text-gold">{user.referralCount}</p>
        </div>
        {rewards.next ? (
          <p className="mt-2 text-sm text-cream/55">
            До «{rewards.next.title}» осталось{" "}
            <span className="text-cream-soft">{Math.max(0, rewards.next.at - user.referralCount)}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-teal">Все ступени открыты — легенда кофейни.</p>
        )}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-amber transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {referrals.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {referrals.map((name) => (
              <li
                key={name}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-cream/70"
              >
                @{name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rewards */}
      <section className="mt-10">
        <h2 className="display text-xl font-bold text-cream-soft">Бонусы</h2>
        <ul className="mt-4 space-y-3">
          {[...rewards.unlocked, ...(rewards.next ? [rewards.next] : [])].map((r) => {
            const unlocked = user.referralCount >= r.at;
            return (
              <li
                key={r.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  unlocked
                    ? "border-gold/35 bg-gold/10"
                    : "border-white/10 bg-white/[0.02] opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-cream-soft">{r.title}</p>
                  <span className="text-xs text-cream/45">{r.at} реф.</span>
                </div>
                <p className="mt-1 text-sm text-cream/55">{r.desc}</p>
                {unlocked && (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gold">
                    Открыто — покажи логин в кофейне
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Find users */}
      <section className="mt-10">
        <h2 className="display text-xl font-bold text-cream-soft">Найти пользователей</h2>
        <p className="mt-2 text-sm text-cream/55">Поиск по логину среди зарегистрированных гостей DOFFA.</p>
        <form onSubmit={search} className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
            placeholder="часть логина…"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="rounded-full border border-cream/25 px-5 py-3 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold disabled:opacity-40"
          >
            {searching ? "…" : "Искать"}
          </button>
        </form>
        {hits && (
          <ul className="mt-4 space-y-2">
            {hits.length === 0 ? (
              <li className="text-sm text-cream/45">Никого не нашли</li>
            ) : (
              hits.map((h) => (
                <li
                  key={h.username}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-cream-soft">@{h.username}</span>
                  <span className="text-cream/45">{h.referralCount} реф.</span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <div className="mt-12 flex flex-wrap gap-4 text-sm">
        {user.role === "admin" && (
          <Link href="/admin" className="font-semibold text-gold hover:text-amber">
            Админ-панель →
          </Link>
        )}
        <Link href="/" className="text-cream/40 hover:text-gold">
          ← На главную
        </Link>
      </div>
    </main>
  );
}
