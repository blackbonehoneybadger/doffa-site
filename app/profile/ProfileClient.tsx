"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dict, LANGS, type Lang } from "../content";
import { connectWalletById, disconnectWalletById, signMessageById, fetchBalance } from "../solana";
import { Identicon } from "../components/Identicon";

type User = {
  wallet_address: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string;
};

type Loyalty = {
  account: { wallet_address: string; bonus_points: number } | null;
  purchases: { id: number; item: string; amount_cents: number | null; points_earned: number; created_at: string }[];
};

const WALLET_OPTS = [
  { id: "phantom", name: "Phantom" },
  { id: "solflare", name: "Solflare" },
  { id: "trust", name: "Trust Wallet" },
  { id: "backpack", name: "Backpack" },
] as const;

export default function ProfileClient() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = dict[lang];

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const [walletId, setWalletId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setLoyalty(data.loyalty);
        setNickname(data.user.nickname ?? "");
        fetchBalance(data.user.wallet_address).then(setBalance).catch(() => setBalance(0));
      }
    } catch {
      // тихо — просто останемся на экране входа
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setUser(data.user);
        setLoyalty(data.loyalty);
        setNickname(data.user.nickname ?? "");
        fetchBalance(data.user.wallet_address).then(setBalance).catch(() => setBalance(0));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnectAndSignIn(id: string) {
    setError(null);
    setConnecting(true);
    const addr = await connectWalletById(id);
    setConnecting(false);
    if (!addr) return;
    setWalletId(id);
    setSigning(true);
    try {
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr }),
      }).then((r) => r.json());
      if (!nonceRes.token) {
        setError(nonceRes.error ?? t.profile.errorGeneric);
        setSigning(false);
        return;
      }
      const signature = await signMessageById(id, nonceRes.message);
      if (!signature) {
        setError(t.profile.errorGeneric);
        setSigning(false);
        return;
      }
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: nonceRes.token, signature }),
      }).then((r) => r.json());
      if (!verifyRes.ok) {
        setError(verifyRes.error ?? t.profile.errorGeneric);
        setSigning(false);
        return;
      }
      await loadProfile();
    } catch {
      setError(t.profile.errorGeneric);
    } finally {
      setSigning(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    if (walletId) await disconnectWalletById(walletId);
    setUser(null);
    setLoyalty(null);
    setBalance(null);
    setWalletId(null);
    setNickname("");
  }

  async function handleSaveNickname() {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      }).then((r) => r.json());
      if (res.ok) {
        setUser(res.user);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
      } else {
        setError(res.error ?? t.profile.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  }

  const memberSinceDate = user ? new Date(user.created_at).toLocaleDateString(t.locale) : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-24 pt-28">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← doffa.coffee
        </Link>
        <label className="relative flex items-center">
          <span className="sr-only">Language</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label="Выбор языка"
            className="cursor-pointer appearance-none rounded-full border border-white/10 bg-ink/60 py-1.5 px-3 text-xs font-bold text-cream/80 outline-none transition hover:border-gold/50 hover:text-cream focus:border-gold/60"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code} className="bg-ink text-cream">
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        {t.profile.tag}
      </p>
      <h1 className="display mt-4 text-4xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-5xl">
        {t.profile.title}
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-cream/70">{t.profile.sub}</p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 h-40 animate-pulse rounded-3xl bg-white/5" />
      ) : !user ? (
        <div className="card mt-10 rounded-3xl p-8">
          <p className="mb-4 text-xs uppercase tracking-wider text-cream/40">{t.profile.chooseWallet}</p>
          <div className="flex flex-col gap-2">
            {WALLET_OPTS.map((w) => (
              <button
                key={w.id}
                disabled={connecting || signing}
                onClick={() => handleConnectAndSignIn(w.id)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-cream transition hover:border-gold/40 hover:bg-white/10 disabled:opacity-50"
              >
                <span>{w.name}</span>
                <span className="text-xs font-normal text-cream/40">
                  {connecting ? t.profile.connecting : signing ? t.profile.signing : t.profile.connectCta}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          {/* Профиль */}
          <div className="card rounded-3xl p-8">
            <div className="flex items-center gap-4">
              <Identicon seed={user.wallet_address} label={user.nickname ?? undefined} size={56} />
              <div className="min-w-0">
                <p className="font-mono text-sm text-cream/60 break-all">
                  {user.wallet_address.slice(0, 6)}…{user.wallet_address.slice(-6)}
                </p>
                {memberSinceDate && (
                  <p className="mt-0.5 text-xs text-cream/40">
                    {t.profile.memberSince} {memberSinceDate}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-cream/40">
                {t.profile.nicknameLabel}
              </label>
              <div className="flex gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.profile.nicknamePlaceholder}
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-ink/40 px-4 py-2.5 text-sm text-cream outline-none transition focus:border-gold/50"
                />
                <button
                  onClick={handleSaveNickname}
                  disabled={saving || !nickname.trim()}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-gold to-copper px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
                >
                  {savedFlash ? t.profile.saved : t.profile.saveCta}
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream/50">{t.profile.balanceLabel}</span>
              <span className="font-mono text-sm font-bold text-gold">
                {balance === null ? "…" : balance.toLocaleString(t.locale)}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 text-xs font-semibold text-cream/40 transition hover:text-cream/70"
            >
              {t.profile.logoutCta}
            </button>
          </div>

          {/* Лояльность кофейни */}
          <div className="card rounded-3xl p-8">
            <h2 className="display text-lg font-bold text-cream-soft">{t.profile.loyaltyTitle}</h2>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream/50">{t.profile.loyaltyPoints}</span>
              <span className="text-lg font-bold text-cream-soft">{loyalty?.account?.bonus_points ?? 0}</span>
            </div>
            {loyalty && loyalty.purchases.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {loyalty.purchases.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-cream/70"
                  >
                    <span>{p.item}</span>
                    <span className="text-teal">+{p.points_earned}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-cream/50">{t.profile.loyaltyEmpty}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
