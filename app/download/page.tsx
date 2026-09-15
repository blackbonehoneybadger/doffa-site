import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "Как открыть DOFFA DRAKA · DOFFA Games",
  description:
    "DOFFA DRAKA открывается прямо в Telegram — ставить ничего не нужно. Одиннадцать бойцов, десять арен, живые соперники и турниры.",
  alternates: { canonical: "/download" },
};

// Страница «Как открыть»: DOFFA Games (главная игра — DOFFA DRAKA).
//
// Раньше здесь были кнопка «скачать APK» и браузерная версия. Ни того, ни
// другого нет и не планируется: игра живёт в Telegram и открывается там за одно
// нажатие. Страница осталась по прежнему адресу, потому что на неё ведут ссылки
// и карта сайта, но говорит теперь правду — без фальшивых кнопок «готовится».
export default function DownloadPage() {
  const телеграм = ECOSYSTEM.game.telegramUrl;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        {ECOSYSTEM.productName} · PLAY
      </p>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Как открыть
        <br />
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
          {ECOSYSTEM.primaryGameName}
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Игра живёт в <b className="text-cream-soft">Telegram</b> и открывается прямо там —
        скачивать и устанавливать ничего не нужно, регистрироваться тоже.
      </p>
      <p className="mt-1 text-sm text-cream/40">
        {ECOSYSTEM.primaryGameName} runs inside Telegram — no install, no signup.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { n: "1", t: "Открой бота", d: `Нажми кнопку ниже или найди @${ECOSYSTEM.game.botUsername} в поиске Telegram.` },
          { n: "2", t: "Запусти игру", d: "Кнопка меню в чате открывает игру внутри мессенджера." },
          { n: "3", t: "Дерись", d: "Выбирай бойца и арену. Соперник — компьютер, друг или любой игрок из рейтинга." },
        ].map((s) => (
          <div key={s.n} className="card rounded-3xl p-7">
            <span className="display text-3xl font-extrabold text-gold">{s.n}</span>
            <h2 className="display mt-3 text-xl font-bold text-cream-soft">{s.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream/65">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <a
          href={телеграм}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-9 py-4 text-lg font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
        >
          ⚔️ Открыть в Telegram ↗
        </a>
      </div>

      <div className="card mt-12 rounded-3xl p-7">
        <h2 className="display text-2xl font-bold text-cream-soft">На чём работает</h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-cream/70">
          <li>• Телефон на Android или iPhone — игра открывается в приложении Telegram.</li>
          <li>• Компьютер — в Telegram для Windows, macOS и Linux.</li>
          <li>
            • Отдельного приложения в магазинах нет и не планируется: обновления приезжают
            сразу всем, без ожидания проверки магазина.
          </li>
        </ul>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-cream/40">
        Зёрна — внутренняя энергия игры. Обмен зёрен на {ECOSYSTEM.token.symbol} и вывод на
        свой кошелёк в {ECOSYSTEM.token.network} готовятся; пока они не включены, зёрна за
        обмен не списываются. Статусы всех функций — на странице прозрачности.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/game" className="text-sm font-semibold text-gold transition hover:text-amber">
          Подробнее об игре →
        </Link>
        <Link href="/transparency" className="text-sm font-semibold text-gold transition hover:text-amber">
          Экономика и проверка →
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
