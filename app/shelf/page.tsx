import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "DOFFA Shelf — тапай и копи Beans · DOFFA Games",
  description:
    "DOFFA Shelf — точка входа в экосистему: тапай и копи Beans, внутриигровую энергию. Beans не криптовалюта и не токен.",
  alternates: { canonical: "/shelf" },
};

export default function ShelfPage() {
  const status = ECOSYSTEM.status.shelf;
  const url = ECOSYSTEM.game.shelfUrl;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        {ECOSYSTEM.productName} · SHELF
      </p>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        DOFFA
        <br />
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
          Shelf
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Точка входа в экосистему. Тапай полку — копи <b className="text-cream-soft">Beans</b>,
        внутриигровую энергию. Beans открывают доступ к DOFFA Arena и DOFFA Heroes.
      </p>

      {/* Главное разграничение. Повторяем его на каждой игровой странице, потому
          что путаница «Beans = криптовалюта» — самое вероятное недопонимание. */}
      <div className="card mt-8 rounded-2xl border border-cream/15 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
          Beans — не токен
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cream/70">
          Beans существуют только внутри игры. Это не криптовалюта, их нет в блокчейне, их
          нельзя купить, продать или вывести, и у них нет курса. DOFFA — отдельная сущность:
          SPL-токен в сети Solana. Разницу подробно разбираем на странице{" "}
          <Link href="/token" className="font-semibold text-gold hover:text-amber">
            Token
          </Link>
          .
        </p>
      </div>

      <section className="mt-12">
        <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">Как это работает</h2>
        <ol className="mt-5 space-y-4">
          {[
            { n: "1", t: "Тапай полку", d: "Каждый тап начисляет Beans. Без вложений и без покупки." },
            { n: "2", t: "Копи энергию", d: "Beans накапливаются в твоём игровом профиле." },
            { n: "3", t: "Трать в играх", d: "Beans — входной билет в Arena и Heroes." },
            { n: "4", t: "Играй и соревнуйся", d: "Выполняй игровые условия по прозрачным правилам." },
            { n: "5", t: "Получай DOFFA", d: "Награда в токене начисляется за достижения, а не за тапы." },
          ].map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-sm font-bold text-gold">
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-cream-soft">{s.t}</p>
                <p className="mt-0.5 text-sm text-cream/60">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            Открыть DOFFA Shelf ↗
          </a>
        ) : (
          <div className="card rounded-2xl p-6">
            <p className="text-sm font-semibold text-cream-soft">
              Статус: {STATUS_LABEL_RU[status]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/65">
              Ссылка появится здесь, когда Shelf будет запущен. Фальшивую кнопку, ведущую в
              никуда, мы ставить не станем.
            </p>
          </div>
        )}
      </section>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/arena" className="text-sm font-semibold text-gold transition hover:text-amber">
          DOFFA Arena →
        </Link>
        <Link href="/game" className="text-sm font-semibold text-gold transition hover:text-amber">
          DOFFA Heroes →
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          На главную
        </Link>
      </div>
    </main>
  );
}
