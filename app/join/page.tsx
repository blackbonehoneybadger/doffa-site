"use client";

import Link from "next/link";

/**
 * Точка входа: две явные регистрации —
 * пользователь (профиль по кошельку) и администратор (панель видео).
 */
export default function JoinPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(197,164,110,0.16),_transparent_65%)]"
      />

      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber">DOFFA · РЕГИСТРАЦИЯ</p>
      <h1 className="display mt-3 text-4xl font-extrabold tracking-tight text-cream-soft sm:text-5xl">
        Выбери тип аккаунта
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-cream/60">
        Два разных входа: для гостей кофейни и для администратора, который загружает видео и смотрит панель.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <Link
          href="/profile"
          className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-gold/50 hover:bg-gold/10"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">Пользователь</span>
          <span className="display mt-4 text-2xl font-extrabold text-cream-soft sm:text-3xl">
            Регистрация пользователя
          </span>
          <span className="mt-3 flex-1 text-sm leading-relaxed text-cream/60">
            Войди через Solana-кошелёк: ник, баланс $DOFFA, бонусы кофейни.
          </span>
          <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink transition group-hover:brightness-110">
            Зарегистрироваться →
          </span>
        </Link>

        <Link
          href="/admin"
          className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-teal/50 hover:bg-teal/10"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-teal">Администратор</span>
          <span className="display mt-4 text-2xl font-extrabold text-cream-soft sm:text-3xl">
            Регистрация администратора
          </span>
          <span className="mt-3 flex-1 text-sm leading-relaxed text-cream/60">
            Вход в панель: загрузка видео на главную, ротация роликов, доступ владельца.
          </span>
          <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-teal/50 bg-teal/15 px-6 py-3 text-sm font-bold text-teal transition group-hover:bg-teal/25">
            Войти как админ →
          </span>
        </Link>
      </div>

      <p className="mt-12 text-center">
        <Link href="/" className="text-sm text-cream/40 transition hover:text-gold">
          ← На главную
        </Link>
      </p>
    </main>
  );
}
