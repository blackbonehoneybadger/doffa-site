import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "Скачать · DOFFA Heroes",
  description:
    "Играй в DOFFA Heroes в браузере или на Android. Собирай зёрна, проходи забеги с волнами врагов и забирай подтверждённые награды $DOFFA на Solana-кошелёк.",
  alternates: { canonical: "/download" },
};

// Страница «Скачать»: DOFFA Games (главная игра — DOFFA Heroes). Статическая,
// вне клиентского словаря — RU-основной текст с EN-подстрочником, стиль сайта.
// Ссылки и статусы — из централизованной конфигурации (ECOSYSTEM). Пока веб/APK
// не подключены — честный статус «готовится», без фальшивых ссылок.
export default function DownloadPage() {
  const webUrl = ECOSYSTEM.game.webUrl;
  const apk = ECOSYSTEM.game.apk;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        {ECOSYSTEM.productName} · DOWNLOAD
      </p>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Скачать
        <br />
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
          {ECOSYSTEM.productName}
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Главная игра — <b className="text-cream-soft">{ECOSYSTEM.primaryGameName}</b>. Собирай
        зёрна во встроенной тапалке, проходи забеги с волнами врагов и забирай подтверждённые
        награды в $DOFFA на свой Solana-кошелёк.
      </p>
      <p className="mt-1 text-sm text-cream/40">
        {ECOSYSTEM.productName} — collect Beans, clear {ECOSYSTEM.primaryGameName} runs,
        claim verified $DOFFA rewards to your Solana wallet.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {/* Веб-версия */}
        <div className="card flex flex-col rounded-3xl p-8">
          <span className="text-3xl">🌐</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Играть в браузере</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Открой {ECOSYSTEM.primaryGameName} на телефоне или компьютере — без установки.
          </p>
          {webUrl ? (
            <a
              href={webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
            >
              Играть сейчас ↗
            </a>
          ) : (
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream/20 px-7 py-3 font-semibold text-cream/50">
              Браузерная версия готовится
            </span>
          )}
        </div>

        {/* Android APK */}
        <div className="card flex flex-col rounded-3xl p-8">
          <span className="text-3xl">🤖</span>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Android APK</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/65">
            Нативное приложение {ECOSYSTEM.productName} для Android.
          </p>
          {apk.url ? (
            <>
              <a
                href={apk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
              >
                Скачать APK ↗
              </a>
              <dl className="mt-5 space-y-1 text-xs text-cream/50">
                {apk.version && <div>Версия: <span className="text-cream/70">{apk.version}</span></div>}
                {apk.size && <div>Размер: <span className="text-cream/70">{apk.size}</span></div>}
                {apk.sha256 && <div className="break-all">SHA-256: <span className="text-cream/70">{apk.sha256}</span></div>}
              </dl>
            </>
          ) : (
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream/20 px-7 py-3 font-semibold text-cream/50">
              Android-версия {ECOSYSTEM.productName} готовится
            </span>
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-cream/40">
        Награда $DOFFA поступает из Reward Vault после подтверждённого прохождения забега, а не за простой тап
        или тренировочный режим. Ссылки и APK публикуются только после проверки.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/game" className="text-sm font-semibold text-gold transition hover:text-amber">
          Подробнее об игре →
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
