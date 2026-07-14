"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось войти");
        return;
      }
      if (next.startsWith("/")) {
        router.push(next);
      } else if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
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
        autoComplete="current-password"
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
        placeholder="••••••••"
      />

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !username || !password}
        className="mt-6 w-full rounded-full bg-gold px-6 py-3 font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Вхожу…" : "Войти"}
      </button>

      <p className="mt-5 text-center text-sm text-cream/50">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-gold hover:text-amber">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-md px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(63,182,168,0.14),_transparent_70%)]"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal">DOFFA · ACCOUNT</p>
      <h1 className="display mt-3 text-4xl font-extrabold text-cream-soft">Вход</h1>
      <p className="mt-2 text-sm leading-relaxed text-cream/60">
        Войди по логину и паролю — кабинет, рефералы и бонусы ждут внутри.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="card h-48 animate-pulse rounded-2xl" />}>
          <LoginForm />
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
