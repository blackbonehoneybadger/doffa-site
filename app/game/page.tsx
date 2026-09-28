import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "Игра DOFFA DRAKA — играть в Telegram",
  description:
    "DOFFA DRAKA — боковой файтинг в Telegram. Одиннадцать бойцов, пятнадцать арен, турниры, бои с живыми соперниками и зёрна, которые меняются на DOFF в сети TON.",
  alternates: { canonical: "/game" },
  openGraph: {
    title: "DOFFA DRAKA — боковой файтинг в Telegram",
    description:
      "Одиннадцать бойцов, пятнадцать арен, турниры и живые соперники. Приложение на телефон — в ожидании, бот в Telegram работает уже сейчас.",
    type: "website",
    images: [{ url: "/brand/game/fight-roastery.jpg", width: 1200, height: 675 }],
  },
};

// Вкладка «Игра». Раньше была «Скачать»: владелец 28.09.2026 решил, что
// человек, пришедший за игрой, должен сразу выбрать, где играть, — приложение на
// телефон или бот в Telegram. Приложения пока нет, оно в ожидании, и кнопка
// говорит это честно; бот работает, и кнопка ведёт в него по реферальной ссылке
// владельца (ECOSYSTEM.game.telegramUrl).
//
// Все числа на странице — из кода игры: состав (public/data.mjs HEROES),
// арены (STAGES), турниры (TOWERS), потолки ставок (CPU_STAKE_LIMIT), дележ
// (server/token-split.mjs), суточный потолок зёрен (server/economy.mjs).

const GAME = ECOSYSTEM.primaryGameName;
const ЭК = ECOSYSTEM.economy;

// Состав — в порядке игры, с ролями с экрана выбора. Портреты те же, что игрок
// видит, выбирая бойца.
const FIGHTERS: { key: string; name: string; role: string }[] = [
  { key: "badger", name: "HONEY BADGER", role: "Натиск" },
  { key: "boy", name: "BOY", role: "Сила" },
  { key: "pata", name: "PATA", role: "Дистанция" },
  { key: "hadida", name: "HADIDA", role: "Контратака" },
  { key: "kroo", name: "MR. KROO", role: "Точность" },
  { key: "ansar", name: "ANSAR", role: "Тактика" },
  { key: "kaprizat", name: "KAPRIZ A.T.", role: "Контрзахват" },
  { key: "selya", name: "SELYA", role: "Быстрый натиск" },
  { key: "zama", name: "ZAMA", role: "Стальной захват" },
  { key: "edik", name: "EDIK", role: "Расчёт" },
  { key: "erik", name: "ERIK", role: "Нажим" },
];

// Восемь мест; вместе с вариантами по времени суток и погоде — пятнадцать арен.
const PLACES: { key: string; name: string; variants: string }[] = [
  { key: "roastery", name: "Медная обжарочная", variants: "ночью, в дыму" },
  { key: "rooftop", name: "Кофейная крыша", variants: "на рассвете, в грозу" },
  { key: "plantation", name: "Горная плантация", variants: "в тумане, на закате, перевал в снегу" },
  { key: "storage", name: "Кофейный склад", variants: "" },
  { key: "desert", name: "Пустыня", variants: "" },
  { key: "jungle", name: "Джунгли", variants: "" },
  { key: "hell", name: "Ад", variants: "" },
  { key: "bridge", name: "Мост над облаками", variants: "" },
];

const MODES: { t: string; d: string }[] = [
  { t: "Турнир", d: "Лестница соперников: новичок — 4 боя, воин — 8, мастер — 12." },
  { t: "Компьютер", d: "Одиночный бой на трёх уровнях сложности. Каждый новый бой — новая арена и новый соперник." },
  { t: "Онлайн", d: "Живой соперник по ID или общий вызов всем. Одинаковые ставки, бой до двух побед, победитель забирает банк." },
  { t: "Тренировка", d: "Манекен, который стоит, держит блок или садится в нижний блок, — чтобы отработать приёмы." },
];

const MECHANICS: string[] = [
  "Боковой файтинг: удары руками и ногами, блок стоя и нижний блок, прыжки, рывки и броски.",
  "У каждого бойца три своих спецприёма — со своим замахом, ударом и выходом.",
  "Добивания в конце матча: у каждого бойца своё фаталити и бруталити.",
  "Одиннадцать бойцов с разной дистанцией, темпом и силой — это не одна модель в разных шкурах.",
  "Повторы: любой бой можно пересмотреть.",
  "Друзья по ID, общий рейтинг лиги и приглашения по ссылке.",
];

const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Открой бота", d: `@${ECOSYSTEM.game.botUsername} в Telegram — игра открывается прямо в мессенджере.` },
  { n: "2", t: "Собирай зёрна", d: "Тапы, приглашения друзей и победы над компьютером дают зёрна — внутреннюю энергию игры." },
  { n: "3", t: "Дерись", d: "Против компьютера — на зёрна. Против живого соперника — за банк и место в рейтинге." },
  { n: "4", t: "Меняй на DOFF", d: "Зёрна меняются на DOFF в сети TON по курсу, который пересчитывается раз в сутки." },
  { n: "5", t: "Выводи на свой кошелёк", d: "DOFF уходит на твой кошелёк в TON. Каждый перевод виден в сети." },
];

// Бейдж честного статуса функции. Не выдаём «Готовится» за «Работает».
function StatusBadge({ status, label }: { status: FeatureStatus; label?: string }) {
  const tone =
    status === "live"
      ? "border-teal/40 bg-teal/10 text-teal"
      : status === "testing"
        ? "border-amber/40 bg-amber/10 text-amber"
        : "border-cream/25 bg-white/5 text-cream/55";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? STATUS_LABEL_RU[status]}
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

// Кнопка магазина: живая ссылка, если владелец задал адрес, иначе — неактивная
// с подписью «в ожидании». Пустая ссылка «#» была бы кнопкой, которая врёт.
function StoreButton({ href, label }: { href: string | null; label: string }) {
  const base = "flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} border border-gold/50 text-gold hover:bg-gold/10`}>
      {label} ↗
    </a>
  ) : (
    <span aria-disabled="true" className={`${base} cursor-not-allowed border border-white/10 text-cream/40`}>
      {label} · скоро
    </span>
  );
}

export default function GamePage() {
  const telegram = ECOSYSTEM.game.telegramUrl;
  const app = ECOSYSTEM.game.app;
  const бой = ЭК.fight;
  const вывод = ЭК.withdrawal;
  const приложениеЕсть = ECOSYSTEM.status.mobileApp === "live";

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-24 pt-28">
      {/* HERO */}
      <div className="flex flex-wrap items-center gap-4">
        <Kicker>{ECOSYSTEM.productName} · ИГРА</Kicker>
        <StatusBadge status={ECOSYSTEM.status.game} />
      </div>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-7xl">
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">{GAME}</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Боковой файтинг: одиннадцать бойцов, пятнадцать арен, турниры и живые соперники.
        Выбери, где играть.
      </p>

      {/* ВЫБОР: Telegram или приложение */}
      <section id="choose" aria-label="Где играть" className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="card flex flex-col rounded-3xl p-7 ring-1 ring-gold/30">
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl" aria-hidden>✈️</span>
            <StatusBadge status="live" />
          </div>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Бот в Telegram</h2>
          <p className="mt-1 text-xs font-semibold text-gold/80">@{ECOSYSTEM.game.botUsername}</p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/70">
            Игра открывается прямо в Telegram — на телефоне и на компьютере. Ставить ничего не
            нужно, регистрироваться тоже: аккаунт — это твой Telegram.
          </p>
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3.5 text-base font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            ⚔️ Играть в Telegram ↗
          </a>
        </div>

        <div className="card flex flex-col rounded-3xl p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl" aria-hidden>📱</span>
            <StatusBadge status={ECOSYSTEM.status.mobileApp} label={приложениеЕсть ? undefined : "В ожидании"} />
          </div>
          <h2 className="display mt-4 text-2xl font-bold text-cream-soft">Приложение на телефон</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/70">
            {приложениеЕсть
              ? "Приложение для iPhone и Android — выбери свой магазин."
              : "Отдельное приложение для iPhone и Android готовится. Как только оно выйдет, кнопки ниже заработают. А пока — играй в Telegram: там игра уже работает."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StoreButton href={app.ios} label="App Store" />
            <StoreButton href={app.android} label="Google Play" />
          </div>
        </div>
      </section>

      {/* КАДР ИЗ ИГРЫ */}
      <figure className="mt-12 overflow-hidden rounded-3xl ring-1 ring-gold/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/game/fight-roastery.jpg" alt={`${GAME}: HONEY BADGER против BOY на арене «Медная обжарочная»`} className="w-full" loading="lazy" />
        <figcaption className="bg-ink/60 px-5 py-3 text-xs text-cream/55">
          Кадр из игры: HONEY BADGER проводит рывок плечом против BOY.
        </figcaption>
      </figure>

      {/* РЕЖИМЫ */}
      <section className="mt-20">
        <Kicker>Режимы</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Четыре способа драться</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MODES.map((m) => (
            <div key={m.t} className="card rounded-2xl p-5">
              <h3 className="display text-lg font-bold text-cream-soft">{m.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* МЕХАНИКА */}
      <section className="mt-20">
        <Kicker>Механика</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Как устроен бой</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {MECHANICS.map((m) => (
            <li key={m} className="card flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed text-cream/75">
              <span className="mt-0.5 text-gold">◆</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/game/fight-plantation.jpg" alt="SELYA и ZAMA на арене «Горная плантация»" className="w-full rounded-3xl ring-1 ring-white/10" loading="lazy" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/game/fight-rooftop.jpg" alt="BOY с кувалдой против HONEY BADGER на кофейной крыше" className="w-full rounded-3xl ring-1 ring-white/10" loading="lazy" />
        </div>
      </section>

      {/* БОЙЦЫ */}
      <section className="mt-20">
        <Kicker>Состав</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Одиннадцать бойцов</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          У каждого своя дистанция, свой темп, три своих спецприёма и своё добивание.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {FIGHTERS.map((f) => (
            <figure key={f.key} className="card overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/game/fighter-${f.key}.jpg`} alt={`Боец ${f.name} из ${GAME}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              <figcaption className="px-4 py-3 text-center">
                <span className="display block text-sm font-bold tracking-wide text-cream-soft">{f.name}</span>
                <span className="text-[11px] uppercase tracking-wider text-gold/80">{f.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* АРЕНЫ */}
      <section className="mt-20">
        <Kicker>Арены</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Пятнадцать арен</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          Восемь мест — от обжарочной кофейни до моста над облаками. Три из них ещё и в разное
          время суток и в разную погоду: ночь, рассвет, гроза, туман, дым, закат, снег.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PLACES.map((p) => (
            <figure key={p.key} className="card overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/game/arenas/${p.key}.jpg`} alt={`Арена «${p.name}»`} className="aspect-video w-full object-cover" loading="lazy" />
              <figcaption className="px-3 py-2.5">
                <span className="block text-sm font-semibold text-cream-soft">{p.name}</span>
                {p.variants && <span className="block text-[11px] text-cream/50">+ {p.variants}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ЗЁРНА */}
      <section className="mt-20">
        <Kicker>Зёрна</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Внутренняя энергия игры</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ul className="space-y-2.5 text-sm leading-relaxed text-cream/75">
            <li>• Зёрна дают тапы, приглашения друзей и победы над компьютером.</li>
            <li>
              • За сутки один аккаунт может создать не больше{" "}
              <b className="text-cream-soft">{ЭК.dailyBeanCap.toLocaleString("ru-RU")} зёрен</b>. Потолок
              проверяется до боя, а не после.
            </li>
            <li>
              • Ставка против компьютера ограничена уровнем: 1 000 у новичка, 5 000 у воина,
              10 000 у мастера. Компьютер повторяет ставку, и без потолка выигрыш удваивался бы
              бесконечно.
            </li>
            <li>• Против живого соперника потолка нет: там зёрна не создаются, а переходят.</li>
            <li>• Пригласи друга — за его первый бой с живым соперником тебе начислится 1 000 зёрен.</li>
          </ul>
          <div className="card rounded-3xl border border-copper/25 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-copper">Правило без исключений</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/80">
              <b className="text-cream-soft">Компьютер никогда не источник DOFF.</b> Победа над ботом
              даёт зёрна и только зёрна. Иначе фонд наград стал бы банкоматом для того, кто
              научился обыгрывать бота, — и кончился бы за недели.
            </p>
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
        <p className="mt-5 flex flex-wrap items-center gap-3 text-xs text-cream/50">
          Шаги 4 и 5 <StatusBadge status={ECOSYSTEM.status.exchange} /> — обмен и вывод откроются,
          когда фонд наград будет наполнен и к нему подключат отправителя выплат. До этого
          зёрна не списываются.
        </p>
      </section>

      {/* ДЕЛЁЖ */}
      <section className="mt-20">
        <Kicker>Куда уходит DOFF</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Сжигание и призовой фонд</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          Часть каждой суммы сгорает навсегда, часть возвращается игрокам через призы. Это не
          сбор в чью-то пользу: сожжённое исчезает из сети, призовое уходит победителям.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-3xl p-6">
            <h3 className="display text-lg font-bold text-cream-soft">Бой на DOFF</h3>
            <p className="mt-1 text-xs text-cream/50">Банк — это две равные ставки.</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cream/60">Победителю</dt>
                <dd className="display font-bold text-teal">{бой.winner} %</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/60">Сгорает</dt>
                <dd className="display font-bold text-copper">{бой.burn} %</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/60">В призовой фонд</dt>
                <dd className="display font-bold text-gold">{бой.prize} %</dd>
              </div>
            </dl>
          </div>
          <div className="card rounded-3xl p-6">
            <h3 className="display text-lg font-bold text-cream-soft">Вывод на свой кошелёк</h3>
            <p className="mt-1 text-xs text-cream/50">Держится нарочно маленьким.</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cream/60">Игроку</dt>
                <dd className="display font-bold text-teal">{вывод.player} %</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/60">Сгорает</dt>
                <dd className="display font-bold text-copper">{вывод.burn} %</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/60">В призовой фонд</dt>
                <dd className="display font-bold text-gold">{вывод.prize} %</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link href="/transparency" className="text-sm font-semibold text-gold transition hover:text-amber">
            Почему фонд наград не кончается — с цифрами →
          </Link>
        </div>
      </section>

      {/* ФИНАЛЬНЫЙ ПРИЗЫВ */}
      <div className="card mt-20 rounded-3xl p-8 text-center ring-1 ring-gold/30">
        <h2 className="display text-3xl font-bold text-cream-soft">Готов драться?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-cream/65">Бот уже ждёт. Одно нажатие — и ты на арене.</p>
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-9 py-4 text-lg font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
        >
          ⚔️ Играть в Telegram ↗
        </a>
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
