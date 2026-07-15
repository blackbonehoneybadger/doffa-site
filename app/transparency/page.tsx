import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";

export const metadata: Metadata = {
  title: "Прозрачность — Reward Vault и сжигание · DOFFA Games",
  description:
    "Как устроены награды DOFFA Games: Reward Vault, распределение и сжигание. Показываем только реальные данные и честные статусы — без придуманных адресов и цифр.",
  alternates: { canonical: "/transparency" },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-amber">
      <span aria-hidden className="h-px w-9 bg-gradient-to-r from-transparent to-amber" />
      {children}
    </p>
  );
}

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

export default function TransparencyPage() {
  const mint = ECOSYSTEM.token.mint;
  const vault = ECOSYSTEM.rewardVault;
  const burnStatus = ECOSYSTEM.status.burn;
  const rewardsStatus = ECOSYSTEM.status.claims;
  const initial = vault.initial.toLocaleString("ru-RU");

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <Kicker>{ECOSYSTEM.productName} · TRANSPARENCY</Kicker>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Прозрачность
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Награды не создаются из воздуха. Они поступают из заранее выделенного{" "}
        <b className="text-cream-soft">Reward Vault</b>. Здесь мы показываем только реальные
        данные и честные статусы — без придуманных адресов, балансов и транзакций.
      </p>

      {/* REWARD VAULT */}
      <section className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Reward Vault</h2>
          <StatusBadge status={ECOSYSTEM.status.rewardVault} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Первоначальный фонд</p>
            <p className="display mt-2 text-3xl font-extrabold text-cream-soft">{initial} $DOFFA</p>
            <p className="mt-2 text-xs text-cream/50">Выделенный запас на игровые награды (1% эмиссии).</p>
          </div>
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Текущий баланс · распределено · сожжено</p>
            {vault.address ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">
                  Проверяется on-chain. Баланс и движения фонда видны в Solscan.
                </p>
                <a
                  href={`https://solscan.io/account/${vault.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
                >
                  Открыть кошелёк в Solscan ↗
                </a>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Публичный адрес фонда ещё не опубликован — статус{" "}
                <b className="text-cream/80">{STATUS_LABEL_RU.planned}</b>. Пока адрес не задан,
                мы не показываем никаких «текущих» цифр, чтобы не выдавать выдуманное за реальное.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* РАСПРЕДЕЛЕНИЕ И СЖИГАНИЕ */}
      <section className="mt-14">
        <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Распределение и сжигание</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Ориентировочное распределение награды</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="display text-2xl font-extrabold text-cream-soft">{ECOSYSTEM.reward.playerPercent}%</span>
              <span className="text-sm text-cream/60">игроку</span>
            </div>
            <div className="mt-1.5 flex items-center gap-4">
              <span className="display text-xl font-bold text-copper">{ECOSYSTEM.reward.burnPercent}%</span>
              <span className="text-sm text-cream/60">на сжигание</span>
            </div>
            <p className="mt-3 text-[11px] text-cream/45">Значения берутся из конфигурации и могут меняться.</p>
          </div>
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Сжигание</p>
              <StatusBadge status={burnStatus} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-cream/70">
              Сжигание выполняется проектом отдельной on-chain-операцией. Сожжённые токены
              не поступают игрокам или в пул.
            </p>
            {burnStatus !== "live" && (
              <p className="mt-3 text-[11px] leading-relaxed text-cream/50">
                Пока нет подтверждённых on-chain-транзакций сжигания, статус остаётся{" "}
                «{STATUS_LABEL_RU[burnStatus]}». Мы не обещаем, что сжигание уже активно.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* СТАТУСЫ */}
      <section className="mt-14">
        <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Статусы функций</h2>
        <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
          {[
            { label: "Выплата наград (claims)", status: rewardsStatus },
            { label: "Reward Vault (публичный адрес)", status: ECOSYSTEM.status.rewardVault },
            { label: "Сжигание (on-chain burn)", status: burnStatus },
            { label: "DEX-пул DOFFA/SOL", status: ECOSYSTEM.status.dex },
            { label: "Android APK", status: ECOSYSTEM.status.android },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between bg-white/[0.02] px-5 py-3">
              <span className="text-sm text-cream/75">{r.label}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </section>

      {/* ТОКЕН */}
      <section className="mt-14">
        <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Токен $DOFFA</h2>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Mint токена открыт в Solscan — проверить можно в любой момент.
        </p>
        <a
          href={ECOSYSTEM.token.solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
        >
          Открыть $DOFFA в Solscan ↗
        </a>
        <p className="mt-3 break-all text-[11px] text-cream/40">mint: {mint}</p>
      </section>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/game" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← DOFFA Bean Duel
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
