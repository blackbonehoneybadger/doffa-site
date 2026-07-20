import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Скачать · DOFFA Defense",
  description:
    "Играй в DOFFA Defense в браузере или установи PWA. Зарабатывай зёрна и получай $DOFFA на Solana-кошелёк.",
};

const GAME_URL = "https://zapisnoy-kozel.vercel.app";

// Страница «Скачать»: игра DOFFA Defense. Статическая, вне клиентского
// словаря — RU-основной текст с EN-подстрочником, стиль сайта.
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
          DOFFA Defense
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Фирменная action-игра экосистемы DOFFA: зачищай комнаты, побеждай
        боссов и проходи главы. Зарабатывай зёрна и забирай награду в $DOFFA
        на свой Solana-кошелёк.
      </p>
      <p className="mt-1 text-sm text-cream/40">
        The DOFFA ecosystem action game — clear rooms, beat bosses, complete chapters, and claim $DOFFA to your Solana wallet.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {/* Веб-версия / PWA */}
        <div className="card flex flex-col rounded-3xl p-8">
          <span className="text-3xl">🎮</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Играть в браузере</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Открой игру на телефоне или компьютере — без установки. Добавь на
            экран «Домой», чтобы играть как в приложении (PWA, работает офлайн).
          </p>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            Играть сейчас ↗
          </a>
        </div>

        {/* Android */}
        <div className="card flex flex-col rounded-3xl p-8">
          <span className="text-3xl">🤖</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Android</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Нативное Android-приложение DOFFA Defense пока в разработке. А
            сейчас просто открой игру в браузере телефона и добавь её на экран
            «Домой» — она работает как приложение (PWA).
          </p>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
          >
            Играть в браузере ↗
          </a>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
