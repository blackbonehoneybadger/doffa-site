"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TonConnectUIProvider, useTonConnectUI } from "@tonconnect/ui-react";
import { dict, LANGS, type Lang } from "../content";
import { Identicon } from "../components/Identicon";

type User = {
  wallet_address: string;
  /** Человекочитаемая форма адреса (UQ…). Приезжает вместе с ответом входа. */
  friendly?: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string;
};

type Loyalty = {
  account: { wallet_address: string; bonus_points: number } | null;
  purchases: { id: number; item: string; amount_cents: number | null; points_earned: number; created_at: string }[];
};

/**
 * Кошелёк выбирает сам человек в окне TON Connect, поэтому списка кошельков
 * здесь нет: он приезжает от самого TON Connect и всегда свежий.
 *
 * Манифест отдаётся маршрутом от того же происхождения, с которого открыт
 * сайт, — иначе кошелёк показал бы человеку чужой адрес на предпросмотре.
 */
export default function ProfileClient({ manifestUrl }: { manifestUrl: string }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <ProfileInner />
    </TonConnectUIProvider>
  );
}

function ProfileInner() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = dict[lang];

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);

  const [tonConnectUI] = useTonConnectUI();
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  // Одно подключение — один вход. Без этого возврат из приложения кошелька
  // успевает дёрнуть проверку дважды, и второй раз код уже потрачен.
  const входИдёт = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setLoyalty(data.loyalty);
        setNickname(data.user.nickname ?? "");
        return true;
      }
    } catch {
      // тихо — просто останемся на экране входа
    }
    return false;
  }, []);

  /**
   * Просит у сервера свежий код и кладёт его в параметры подключения. Кошелёк
   * подпишет именно его, и сервер узнает свою подпись.
   *
   * Код живёт пять минут, поэтому его берут заново перед каждым подключением,
   * а не один раз при загрузке страницы.
   */
  const подготовитьКод = useCallback(async () => {
    tonConnectUI.setConnectRequestParameters({ state: "loading" });
    try {
      const res = await fetch("/api/auth/nonce", { method: "POST" }).then((r) => r.json());
      if (!res.payload) throw new Error("нет кода");
      tonConnectUI.setConnectRequestParameters({
        state: "ready",
        value: { tonProof: res.payload },
      });
    } catch {
      // Без кода подключение не докажет владение кошельком. Снимаем запрос
      // целиком, а не пускаем подключиться «просто так»: иначе человек увидит
      // подключённый кошелёк и не поймёт, почему он не вошёл.
      tonConnectUI.setConnectRequestParameters(null);
      setError(t.profile.errorGeneric);
    }
  }, [tonConnectUI, t.profile.errorGeneric]);

  /** Отправляет подпись на сервер и поднимает сессию. */
  const завершитьВход = useCallback(
    async (адрес: string, публичныйКлюч: string, proof: unknown) => {
      if (входИдёт.current) return;
      входИдёт.current = true;
      setSigning(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: адрес, publicKey: публичныйКлюч, proof }),
        }).then((r) => r.json());
        if (!res.ok) {
          setError(res.error ?? t.profile.errorGeneric);
          // Кошелёк остался подключённым, а сессии нет — это самое запутанное
          // состояние для человека. Отключаем, чтобы следующая попытка начала
          // с чистого листа и со свежим кодом.
          await tonConnectUI.disconnect().catch(() => {});
          return;
        }
        setHint(null);
        await loadProfile();
      } catch {
        setError(t.profile.errorGeneric);
      } finally {
        setSigning(false);
        входИдёт.current = false;
      }
    },
    [tonConnectUI, loadProfile, t.profile.errorGeneric],
  );

  async function handleConnect() {
    setError(null);
    setHint(null);
    setConnecting(true);
    try {
      await подготовитьКод();
      await tonConnectUI.openModal();
    } finally {
      setConnecting(false);
    }
  }

  // Сессия могла остаться с прошлого раза — тогда вход не нужен вовсе.
  useEffect(() => {
    let отменено = false;
    void (async () => {
      await loadProfile();
      if (!отменено) setLoading(false);
    })();
    return () => {
      отменено = true;
    };
  }, [loadProfile]);

  // Подключение кошелька приходит сюда же и после возврата из приложения на
  // телефоне, поэтому вход дожимается автоматически, без второго нажатия.
  useEffect(() => {
    const отписаться = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) return;
      const proof = wallet.connectItems?.tonProof;
      if (!proof || !("proof" in proof)) {
        // Кошелёк подключился, но подпись не отдал — старая версия кошелька
        // или отказ. Входа не будет, и молчать об этом нельзя.
        setError(t.profile.errorGeneric);
        await tonConnectUI.disconnect().catch(() => {});
        return;
      }
      await завершитьВход(wallet.account.address, wallet.account.publicKey ?? "", proof.proof);
    });
    return () => отписаться();
  }, [tonConnectUI, завершитьВход, t.profile.errorGeneric]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    await tonConnectUI.disconnect().catch(() => {});
    setUser(null);
    setLoyalty(null);
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
      {hint && !error && (
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-cream/80">
          {hint}
        </div>
      )}

      {loading ? (
        <div className="mt-10 h-40 animate-pulse rounded-3xl bg-white/5" />
      ) : !user ? (
        <div className="card mt-10 rounded-3xl p-8">
          <p className="mb-4 text-xs uppercase tracking-wider text-cream/40">{t.profile.chooseWallet}</p>
          <button
            disabled={connecting || signing}
            onClick={handleConnect}
            className="w-full rounded-xl bg-gradient-to-r from-gold to-copper px-5 py-3.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {connecting ? t.profile.connecting : signing ? t.profile.signing : t.profile.connectCta}
          </button>
          <p className="mt-5 text-xs leading-relaxed text-cream/45">
            {lang === "ru"
              ? "Подойдёт любой кошелёк TON: Tonkeeper, MyTonWallet, Telegram Wallet и другие. Список покажет само окно подключения."
              : "Any TON wallet works: Tonkeeper, MyTonWallet, Telegram Wallet and others. The connect window lists them."}
          </p>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          <div className="card rounded-3xl p-8">
            <div className="flex items-center gap-4">
              <Identicon seed={user.wallet_address} label={user.nickname ?? undefined} size={56} />
              <div className="min-w-0">
                <p className="font-mono text-sm text-cream/60 break-all">
                  {(user.friendly ?? user.wallet_address).slice(0, 6)}…
                  {(user.friendly ?? user.wallet_address).slice(-6)}
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

            <button
              onClick={handleLogout}
              className="mt-6 text-xs font-semibold text-cream/40 transition hover:text-cream/70"
            >
              {t.profile.logoutCta}
            </button>
          </div>

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
