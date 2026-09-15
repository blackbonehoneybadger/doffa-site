import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "DOFFA DRAKA — DOFFA Games",
  description:
    "DOFFA DRAKA — боковой файтинг в Telegram. Одиннадцать бойцов, десять арен, бои с живыми игроками и турниры. Зёрна собираются в игре, DOFF в сети TON — награда экосистемы.",
  alternates: { canonical: "/game" },
  openGraph: {
    title: "DOFFA DRAKA — DOFFA Games",
    description:
      "Боковой файтинг в Telegram: одиннадцать бойцов, десять арен, живые соперники и турниры. Зёрна — игровая энергия, DOFF в TON — награда.",
    type: "website",
  },
};

const GAME = ECOSYSTEM.primaryGameName;
const ЭК = ECOSYSTEM.economy;

// Арты игры — настоящие кадры из DOFFA DRAKA, уменьшенные для веба.
// Не концепт и не превью из нейросети: это то же, что видит игрок в Telegram.
const ART = {
  roastery: "/brand/game/arena-roastery.jpg",
  plantation: "/brand/game/arena-plantation.jpg",
  rooftop: "/brand/game/arena-rooftop.jpg",
  fighters: [
    { src: "/brand/game/fighter-badger.png", name: "HONEY BADGER" },
    { src: "/brand/game/fighter-boy.png", name: "BOY" },
    { src: "/brand/game/fighter-edik.png", name: "EDIK" },
  ],
};

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

const MECHANICS: string[] = [
  "Боковой файтинг: удары, блок, уклонение и приёмы у каждого бойца свои.",
  "Одиннадцать бойцов с разными характерами боя — это не одна модель в разных шкурах.",
  "Десять арен: обжарочная, кофейная крыша и горная плантация в разное время суток и в разную погоду.",
  "Бои с компьютером на трёх уровнях: новичок, воин, мастер.",
  "Бои с живыми игроками, друзья по ID, общий рейтинг и турниры.",
  "Повторы боёв: любой поединок можно пересмотреть.",
];

const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Открой в Telegram", d: `Игра живёт в @${ECOSYSTEM.game.botUsername}. Ставить ничего не нужно — она открывается прямо в мессенджере.` },
  { n: "2", t: "Собирай зёрна", d: "Тапы, приглашения друзей и победы над компьютером дают зёрна — внутреннюю энергию игры." },
  { n: "3", t: "Дерись", d: "Против компьютера — на зёрна. Против живого соперника — за место в рейтинге и за банк." },
  { n: "4", t: "Меняй на DOFF", d: "Зёрна обмениваются на DOFF в сети TON по курсу, который пересчитывается раз в сутки." },
  { n: "5", t: "Выводи на свой кошелёк", d: "DOFF уходит на твой кошелёк в TON. Каждый перевод виден в сети." },
];

export default function GamePage() {
  const telegram = ECOSYSTEM.game.telegramUrl;
  const бой = ЭК.fight;
  const вывод = ЭК.withdrawal;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-24 pt-28">
      {/* HERO */}
      <div className="flex flex-wrap items-center gap-4">
        <Kicker>{ECOSYSTEM.productName} · FIGHTING</Kicker>
        <StatusBadge status={ECOSYSTEM.status.game} />
      </div>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">{GAME}</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Боковой файтинг прямо в Telegram. Одиннадцать бойцов, десять арен, живые
        соперники и турниры — <b className="text-cream-soft">без установки и без регистрации</b>.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
        >
          ⚔️ Играть в Telegram ↗
        </a>
        <Link
          href="/transparency"
          className="rounded-full border border-cream/30 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold"
        >
          Экономика и проверка
        </Link>
      </div>

      {/* АРЕНА */}
      <div className="mt-10 overflow-hidden rounded-3xl ring-1 ring-gold/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.roastery} alt={`${GAME} — арена «Медная обжарочная»`} className="w-full" loading="lazy" />
      </div>

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
      </section>

      {/* БОЙЦЫ */}
      <section className="mt-20">
        <Kicker>Состав</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Одиннадцать бойцов</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          У каждого своя дистанция, свой темп и свои приёмы. Трое из состава — ниже.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {ART.fighters.map((f) => (
            <figure key={f.name} className="card overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt={`Боец ${f.name} из ${GAME}`} className="w-full" loading="lazy" />
              <figcaption className="display px-4 py-3 text-center text-sm font-bold tracking-wide text-cream-soft">
                {f.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* АРЕНЫ */}
      <section className="mt-20">
        <Kicker>Арены</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">Десять мест для драки</h2>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          Три места кофейни в разное время суток и в разную погоду: ночь, рассвет,
          гроза, туман, дым, закат, снег. Настроение задаёт свет, а не другая картинка.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.plantation} alt="Арена «Горная плантация»" className="w-full rounded-3xl ring-1 ring-white/10" loading="lazy" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.rooftop} alt="Арена «Кофейная крыша»" className="w-full rounded-3xl ring-1 ring-white/10" loading="lazy" />
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
          когда к фонду наград будет подключён отправитель выплат. До этого зёрна не списываются.
        </p>
      </section>

      {/* ДЕЛЁЖ */}
      <section className="mt-20">
        <Kicker>Куда уходит DOFF</Kicker>
        <h2 className="display mt-4 text-3xl font-bold text-cream-soft sm:text-4xl">
          Сжигание и призовой фонд
        </h2>
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

      <div className="mt-16 text-center">
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
