import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "DOFFA Bean Duel — DOFFA Games",
  description:
    "DOFFA Bean Duel — динамичный соло-забег в стиле Archero. Собирай зёрна, проходи волны врагов движением, уклонением и способностями и забирай подтверждённые награды $DOFFA. Без ставок.",
  alternates: { canonical: "/game" },
  openGraph: {
    title: "DOFFA Bean Duel — DOFFA Games",
    description:
      "Соло-забег на реакцию и навык: волны врагов, движение и способности. Зёрна — входной билет, награда $DOFFA — из Reward Vault после подтверждённого прохождения.",
    type: "website",
  },
};

const GAME = ECOSYSTEM.primaryGameName;

// Бейдж честного статуса функции. Не выдаём Planned за Live.
function StatusBadge({ status }: { status: FeatureStatus }) {
  const tone =
    status === "live"
      ? "border-teal/40 bg-teal/10 text-teal"
      : status === "testing"
        ? "border-amber/40 bg-amber/10 text-amber"
        : "border-cream/25 bg-white/5 text-cream/55";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL_RU[status]}
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
      <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
      {children}
    </p>
  );
}

// Способности показаны как продуктовый preview. Пока функция не реализована в
// публичной сборке — статус honest (Testing/Planned), а не «работает».
const ABILITIES: { icon: string; name: string; desc: string; status: FeatureStatus }[] = [
  { icon: "🫘", name: "Бросок зерна", desc: "Базовая автоатака: персонаж метает зёрна во врагов, пока стоит на месте.", status: "planned" },
  { icon: "💨", name: "Уклонение", desc: "Короткий рывок, чтобы уйти от снарядов и волн врагов.", status: "planned" },
  { icon: "☕", name: "Кофейный плеск", desc: "Удар по площади, замедляет врагов вокруг.", status: "planned" },
  { icon: "🛡️", name: "Щит", desc: "Кратковременная защита от следующей атаки.", status: "planned" },
];

const MECHANICS: string[] = [
  "Соло-забег: волны врагов сменяют друг друга, забег короткий.",
  "Персонаж атакует автоматически, когда стоит на месте — ты управляешь движением и уклонением (механика в стиле Archero).",
  "Между волнами выбираешь усиление — каждый забег складывается по-своему.",
  "Зёрна используются только как входной билет и списываются системой после входа.",
  "За подтверждённое прохождение забега можно получить DOFFA из общего фонда наград (Reward Vault).",
  "Никаких ставок: DOFFA не ставится и не отбирается — награда идёт только из Reward Vault.",
];

const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Тапай", d: "Тапай по фирменной чашке DOFFA во встроенной тапалке." },
  { n: "2", t: "Собирай зёрна", d: "Зёрна — внутренняя игровая энергия. Их нельзя вывести или напрямую обменять на DOFFA." },
  { n: "3", t: "Входи в забег", d: "Определённое количество зёрен используется как билет в забег." },
  { n: "4", t: "Проходи волны", d: "Двигайся, уклоняйся и выбирай способности, чтобы пройти волны врагов." },
  { n: "5", t: "Забирай DOFFA", d: "После серверного подтверждения нажми «Забрать награду»." },
];

export default function GamePage() {
  const webUrl = ECOSYSTEM.game.webUrl;
  const burnLive = ECOSYSTEM.status.burn === "live";
  const player = ECOSYSTEM.reward.playerPercent;
  const burn = ECOSYSTEM.reward.burnPercent;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-24 pt-28">
      {/* HERO */}
      <Kicker>{ECOSYSTEM.productName} · BEAN DUEL</Kicker>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">{GAME}</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Динамичный соло-забег в стиле Archero: волны врагов, движение, уклонение и
        способности фирменного персонажа DOFFA — <b className="text-cream-soft">без ставок</b>.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {webUrl ? (
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            🏹 Играть в браузере ↗
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-7 py-3 font-semibold text-cream/50">
            🏹 Игра готовится
          </span>
        )}
        <Link
          href="/download"
          className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
        >
          Скачать {ECOSYSTEM.productName}
        </Link>
      </div>

      {/* МЕХАНИКА */}
      <section className="mt-20">
        <Kicker>Механика</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Как устроен забег</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {MECHANICS.map((m) => (
            <li key={m} className="card flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed text-cream/75">
              <span className="mt-0.5 text-gold">◆</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* СПОСОБНОСТИ */}
      <section className="mt-20">
        <Kicker>Способности</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Продуктовый preview</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          Набор способностей в разработке. Статусы показаны честно — это превью, а не
          обещание, что функция уже работает в публичной сборке.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ABILITIES.map((a) => (
            <div key={a.name} className="card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{a.icon}</span>
                <StatusBadge status={a.status} />
              </div>
              <h3 className="display mt-3 text-lg font-bold text-cream-soft">{a.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream/65">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ТАПАЛКА / ЗЁРНА */}
      <section className="mt-20">
        <Kicker>Накопить зёрна</Kicker>
        <div className="card mt-4 grid items-center gap-8 rounded-3xl p-8 sm:grid-cols-2">
          <div>
            <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Тапай по чашке</h2>
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-cream/75">
              <li>• Тап даёт зёрна; энергия ограничивает количество тапов.</li>
              <li>• Зёрна нужны для входа в {GAME}.</li>
              <li>• Зёрна нельзя вывести и нельзя напрямую поменять на DOFFA.</li>
            </ul>
            <Link
              href="/download"
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full border border-cream/30 px-6 py-2.5 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold"
            >
              Открыть тапалку
            </Link>
            <p className="mt-3 text-[11px] text-cream/40">
              Полная тапалка — в приложении {ECOSYSTEM.productName}. На сайте это облегчённое превью.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-espresso-deep/60 to-ink/60 ring-1 ring-gold/20">
              <span className="text-7xl" aria-hidden>🦵☕</span>
            </div>
          </div>
        </div>
      </section>

      {/* КАК ЭТО РАБОТАЕТ */}
      <section className="mt-20">
        <Kicker>Как это работает</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Пять шагов</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="card rounded-2xl p-5">
              <span className="display text-2xl font-extrabold text-gold">{s.n}</span>
              <h3 className="display mt-2 text-base font-bold text-cream-soft">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cream/65">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* НАГРАДНАЯ МОДЕЛЬ */}
      <section className="mt-20">
        <Kicker>Награды</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Наградная модель</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ul className="space-y-2.5 text-sm leading-relaxed text-cream/75">
            <li>• Размер награды может зависеть от текущего бюджета Reward Vault.</li>
            <li>• И от количества активных игроков и подтверждённых прохождений.</li>
            <li>• Действуют дневной бюджет и персональные дневные лимиты.</li>
            <li>• Подозрительные забеги могут направляться на проверку.</li>
            <li>• Награда всегда показывается до нажатия «Забрать».</li>
            <li>• DOFFA не выдаётся за простой тап или тренировочный режим.</li>
          </ul>

          {/* Демонстрация интерфейса — НЕ гарантированная фиксированная сумма. */}
          <div className="card rounded-3xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/40">
              Пример интерфейса — демонстрация механики
            </p>
            <div className="mt-3 rounded-2xl border border-teal/25 bg-teal/5 p-5">
              <p className="text-sm font-bold text-teal">Забег подтверждён</p>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-sm text-cream/60">Награда игроку</span>
                <span className="display text-2xl font-extrabold text-cream-soft">4 DOFFA</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm text-cream/60">Сжигание</span>
                <span className="display text-lg font-bold text-copper">1 DOFFA</span>
              </div>
              <button
                type="button"
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-full bg-gradient-to-r from-gold to-copper px-6 py-2.5 text-sm font-bold text-ink opacity-60"
              >
                Забрать награду
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-cream/45">
              Числа выше — пример, а не гарантированная сумма. Ориентировочное распределение
              наградной суммы: {player}% игроку, {burn}% на сжигание (значения из конфигурации).
            </p>
            <p className="mt-2 text-[11px] font-semibold text-cream/55">
              Статус сжигания: {burnLive ? STATUS_LABEL_RU.live : STATUS_LABEL_RU[ECOSYSTEM.status.burn]}
              {!burnLive && " — активируется отдельной on-chain-операцией"}
            </p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link href="/transparency" className="text-sm font-semibold text-gold transition hover:text-amber">
            Прозрачность: Reward Vault и сжигание →
          </Link>
        </div>
      </section>

      <div className="mt-16 text-center">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
