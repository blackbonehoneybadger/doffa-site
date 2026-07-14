"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const refFromUrl = params.get("ref")?.trim().toUpperCase() ?? "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [asAdmin, setAsAdmin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role: asAdmin ? "admin" : "user",
          inviteCode: asAdmin ? inviteCode : undefined,
          referralCode: !asAdmin && referralCode ? referralCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось зарегистрироваться");
        return;
      }
      router.push(data.user?.role === "admin" ? "/admin" : "/account");
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card rounded-2xl p-6 sm:p-8">
      <label className="block text-sm font-semibold text-cream-soft">Логин</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoFocus
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
        placeholder="coffee_lover"
      />

      <label className="mt-4 block text-sm font-semibold text-cream-soft">Пароль</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
        placeholder="••••••••"
      />

      {!asAdmin && (
        <>
          <label className="mt-4 block text-sm font-semibold text-cream-soft">
            Реферальный код <span className="font-normal text-cream/40">(необязательно)</span>
          </label>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 uppercase tracking-wider text-cream-soft outline-none focus:border-gold"
            placeholder="DOFFA123"
          />
        </>
      )}

      <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-cream/70">
        <input
          type="checkbox"
          checked={asAdmin}
          onChange={(e) => setAsAdmin(e.target.checked)}
          className="accent-gold"
        />
        Регистрация администратора
      </label>

      {asAdmin && (
        <>
          <label className="mt-4 block text-sm font-semibold text-cream-soft">Код приглашения</label>
          <input
            type="password"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
            placeholder="ADMIN_INVITE_CODE"
          />
          <p className="mt-2 text-xs text-cream/45">
            Код из переменной окружения ADMIN_INVITE_CODE (или ADMIN_UPLOAD_PASSWORD).
          </p>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !username || !password || (asAdmin && !inviteCode)}
        className="mt-6 w-full rounded-full bg-gold px-6 py-3 font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Создаю…" : "Зарегистрироваться"}
      </button>

      <p className="mt-5 text-center text-sm text-cream/50">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-gold hover:text-amber">
          Войти
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-md px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(197,164,110,0.18),_transparent_70%)]"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber">DOFFA · ACCOUNT</p>
      <h1 className="display mt-3 text-4xl font-extrabold text-cream-soft">Регистрация</h1>
      <p className="mt-2 text-sm leading-relaxed text-cream/60">
        Создай логин и пароль — получи персональную реферальную ссылку и бонусы за друзей.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="card h-64 animate-pulse rounded-2xl" />}>
          <RegisterForm />
        </Suspense>
      </div>
      <p className="mt-8 text-center">
        <Link href="/" className="text-sm text-cream/40 hover:text-gold">
          ← На главную
        </Link>
      </p>
    </main>
  );
}
