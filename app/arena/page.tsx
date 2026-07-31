import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "DOFFA Arena — быстрые соревновательные игры · DOFFA Games",
  description:
    "DOFFA Arena — набор быстрых соревновательных игр экосистемы DOFFA. Beans используются для входа и игровых действий.",
  alternates: { canonical: "/arena" },
};

export default function ArenaPage() {
  const status = ECOSYSTEM.status.arena;
  const url = ECOSYSTEM.game.arenaUrl;
  const split = ECOSYSTEM.rewardModel;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
        <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
        {ECOSYSTEM.productName} · ARENA
      </p>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        DOFFA
        <br />
        <span className="bg-gradient-to-r from-gold via-amber to-copper bg-clip-text text-transparent">
          Arena
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Набор быстрых соревновательных игр. <b className="text-cream-soft">Beans</b>{" "}
        используются для входа и игровых действий — коротких партий, где всё решается за
        минуты.
      </p>

      <div className="card mt-8 rounded-2xl border border-cream/15 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
          Beans — не токен
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cream/70">
          Вход в Arena оплачивается Beans — внутриигровой энергией, которая не является
          криптовалютой и не существует в блокчейне. DOFFA — отдельный SPL-токен, он
          начисляется как награда, а не тратится на вход. Разница разобрана на странице{" "}
          <Link href="/token" className="font-semibold text-gold hover:text-amber">
            Token
          </Link>
          .
        </p>
      </div>

      <section className="mt-12">
        <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">
          Награды и сжигание
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          В дальнейшем матчи Arena смогут распределять DOFFA и часть суммы отправлять в
          реальное сжигание. Сжигание — это отдельная on-chain-инструкция: количество
          токенов в сети уменьшается, и это проверяется в explorer.
        </p>

        <div className="card mt-5 rounded-2xl p-6">
          {split.valid ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
                Распределение
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="display text-2xl font-extrabold text-cream-soft">
                    {split.rewardPercent}%
                  </p>
                  <p className="text-xs text-cream/55">игроку</p>
                </div>
                <div>
                  <p className="display text-2xl font-extrabold text-copper">
                    {split.burnPercent}%
                  </p>
                  <p className="text-xs text-cream/55">на сжигание</p>
                </div>
                <div>
                  <p className="display text-2xl font-extrabold text-teal">
                    {split.treasuryPercent}%
                  </p>
                  <p className="text-xs text-cream/55">в казну</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
                Экономика — draft
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cream/65">
                Конкретные доли ещё не утверждены, поэтому мы их не показываем. Назвать
                проценты до утверждения значило бы дать обещание, которого никто не давал.
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-cream/45">
          Сжигание уменьшает количество токенов в сети. Это не обещание роста цены и не
          гарантия дохода — мы такого не утверждаем.
        </p>
      </section>

      <section className="mt-12">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink shadow-lg shadow-gold/10 transition hover:brightness-110"
          >
            Открыть DOFFA Arena ↗
          </a>
        ) : (
          <div className="card rounded-2xl p-6">
            <p className="text-sm font-semibold text-cream-soft">
              Статус: {STATUS_LABEL_RU[status]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/65">
              Arena ещё не запущена. Ссылка появится здесь, когда игры будут доступны.
            </p>
          </div>
        )}
      </section>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/shelf" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← DOFFA Shelf
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
