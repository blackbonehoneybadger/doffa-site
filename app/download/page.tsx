"use client";

import Link from "next/link";

const GAME_URL = "https://zapisnoy-kozel.vercel.app";
const APK_URL = "https://github.com/blackbonehoneybadger/zapisnoy-kozel/releases";

function track(event: "game_open" | "game_download") {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {});
}

// Страница «Скачать»: игра DOFFA Crazy 8. Клиентская — чтобы считать
// открытия/скачивания для админ-статистики.
export default function DownloadPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        DOFFA · ECOSYSTEM
      </p>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Скачать
        <br />
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
          DOFFA Crazy 8
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Фирменная карточная игра экосистемы DOFFA. Зарабатывай Cups, побеждай и
        забирай награду в $DOFFA на свой Solana-кошелёк.
      </p>
      <p className="mt-1 text-sm text-cream/40">
        The DOFFA ecosystem card game — earn Cups, win, claim $DOFFA to your Solana wallet.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="card flex flex-col rounded-3xl p-8">
          <h2 className="display mt-1 text-2xl font-bold text-cream-soft">Играть в браузере</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Открой игру на телефоне или компьютере — без установки. Добавь на
            экран «Домой», чтобы играть как в приложении (PWA, работает офлайн).
          </p>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track("game_open");
              track("game_download");
            }}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            Играть сейчас ↗
          </a>
        </div>

        <div className="card flex flex-col rounded-3xl p-8">
          <h2 className="display mt-1 text-2xl font-bold text-cream-soft">Android APK</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Нативное приложение для Android. Скачай последний APK из релизов на
            GitHub — приложение обновляется само при каждом деплое.
          </p>
          <a
            href={APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("game_download")}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
          >
            Скачать APK ↗
          </a>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href="/register" className="font-semibold text-gold transition hover:text-amber">
          Регистрация и рефералы →
        </Link>
        <Link href="/" className="font-semibold text-cream/50 transition hover:text-gold">
          ← На главную
        </Link>
      </div>
    </main>
  );
}
