import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";
import { getTokenPrices, formatUsd } from "../lib/external/price";
import {
  burnedFromSupply,
  getMintAuthorities,
  getSupply,
  getTokenBalance,
} from "../lib/solana/chain";


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

/** Число токенов для показа: без дробной части, если она нулевая. */
function amount(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
}

export default async function TransparencyPage() {
  const mint = ECOSYSTEM.token.mint;
  const vault = ECOSYSTEM.rewardVault;
  const unreachable = ECOSYSTEM.unreachable;
  const rewardsStatus = ECOSYSTEM.status.claims;
  const initial = vault.initial.toLocaleString("ru-RU");

  // Реальные данные из сети. Каждая часть независима: недоступность одной не
  // мешает показать остальные, а null означает «не показываем ничего».
  const [prices, supply, authorities, vaultBalance] = await Promise.all([
    getTokenPrices(),
    getSupply(mint),
    getMintAuthorities(mint),
    vault.address ? getTokenBalance(vault.address, mint) : Promise.resolve(null),
  ]);

  // Сожжено = заявленная первоначальная эмиссия минус текущая по данным сети.
  const burned = burnedFromSupply(ECOSYSTEM.token.totalSupply, supply);

  // Статус сжигания больше не берётся из env вслепую: если сеть показывает
  // сожжённые токены — это Live по факту, а не по настройке.
  const burnStatus: FeatureStatus =
    burned !== null && burned > 0 ? "live" : ECOSYSTEM.status.burn;

  // То же для фонда: адрес опубликован и баланс реально прочитан — Live.
  const vaultStatus: FeatureStatus =
    vaultBalance !== null ? "live" : ECOSYSTEM.status.rewardVault;

  // И для DEX-пула. Котировка у токена появляется только при наличии пула
  // ликвидности, поэтому полученная цена — доказательство, что пул создан.
  // Ставить статус вручную не нужно: сайт узнает об этом сам.
  const dexStatus: FeatureStatus =
    prices.doffaUsd !== null ? "live" : ECOSYSTEM.status.dex;

  const authoritiesRevoked =
    authorities !== null &&
    authorities.mintAuthority === null &&
    authorities.freezeAuthority === null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <Kicker>{ECOSYSTEM.productName} · TRANSPARENCY</Kicker>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Прозрачность
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Награды не создаются из воздуха — они выплачиваются из выделенного{" "}
        <b className="text-cream-soft">Reward Vault</b>. Здесь мы показываем только реальные
        данные и честные статусы — без придуманных адресов, балансов и транзакций. В том
        числе неудобные: {unreachable.amount > 0 && "часть токенов утеряна, и мы пишем об этом ниже"}
        {unreachable.amount === 0 && "если что-то не работает, мы говорим об этом прямо"}.
      </p>

      {/* REWARD VAULT */}
      <section className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Reward Vault</h2>
          <StatusBadge status={vaultStatus} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Назначенный фонд</p>
            {vault.initial > 0 ? (
              <>
                <p className="display mt-2 text-3xl font-extrabold text-cream-soft">{initial} $DOFFA</p>
                <p className="mt-2 text-xs text-cream/50">Выделенный запас на игровые награды.</p>
              </>
            ) : (
              <>
                <p className="display mt-2 text-3xl font-extrabold text-cream/45">Не назначен</p>
                <p className="mt-2 text-xs leading-relaxed text-cream/50">
                  Прежний фонд на {unreachable.amount.toLocaleString("ru-RU")} $DOFFA утерян
                  (см. ниже). Новый запас на награды пока не выделен — как только это
                  произойдёт, адрес и баланс появятся здесь.
                </p>
              </>
            )}
          </div>
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Текущий баланс фонда</p>
            {vaultBalance !== null ? (
              <>
                {/* Цифра прочитана из сети прямо сейчас, а не записана в конфиг. */}
                <p className="display mt-2 text-3xl font-extrabold text-cream-soft">
                  {amount(vaultBalance)} $DOFFA
                </p>
                <p className="mt-2 text-xs text-cream/50">
                  Прочитано из блокчейна.
                  {vault.initial > 0 && (
                    <>
                      {" "}Роздано из фонда:{" "}
                      <b className="text-cream/70">
                        {amount(Math.max(0, vault.initial - vaultBalance))} $DOFFA
                      </b>
                      .
                    </>
                  )}
                </p>
                <a
                  href={`https://solscan.io/account/${vault.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
                >
                  Проверить в Solscan ↗
                </a>
              </>
            ) : vault.address ? (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Адрес фонда опубликован, но прочитать баланс из сети сейчас не удалось.
                Показывать вместо него какое-либо число мы не будем — проверить фонд
                можно напрямую в Solscan.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Публичный адрес фонда ещё не опубликован — статус{" "}
                <b className="text-cream/80">{STATUS_LABEL_RU.planned}</b>. Пока адрес не задан,
                мы не показываем никаких «текущих» цифр, чтобы не выдавать выдуманное за реальное.
              </p>
            )}
          </div>
        </div>

        {/* Утерянные токены. Это не сжигание: эмиссия в сети не изменилась.
            Умолчать об этом нельзя — сайт обещает награды, и обещать их из
            недоступного кошелька было бы обманом. */}
        {unreachable.amount > 0 && (
          <div className="card mt-4 rounded-2xl border border-amber/25 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber">
                Заблокированы навсегда · вне обращения
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Доступ утерян
              </span>
            </div>
            <p className="display mt-3 text-3xl font-extrabold text-cream-soft">
              {unreachable.amount.toLocaleString("ru-RU")} $DOFFA
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/70">
              Рассказываем прямо, потому что это видно в блокчейне. 1 июля 2026 года эта
              сумма была переведена с кошелька проекта на отдельный адрес под будущий фонд
              наград. Доступ к нему утерян — приватного ключа нет, и вернуть или потратить
              эти токены не может никто, включая нас.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/70">
              Для держателей это как безвозвратное сжигание: {unreachable.amount.toLocaleString("ru-RU")}{" "}
              $DOFFA никогда не попадут на рынок и не будут кому-то розданы. Формально в сети
              эмиссия по-прежнему {ECOSYSTEM.token.totalSupply.toLocaleString("ru-RU")}, но в
              реальном обращении —{" "}
              <b className="text-cream-soft">
                {ECOSYSTEM.token.effectiveSupply.toLocaleString("ru-RU")} $DOFFA
              </b>
              . Все награды и все расчёты на сайте идут только от этого числа.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cream/45">
              Не верь на слово — проверь сам
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://solscan.io/tx/${unreachable.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-4 py-2 text-sm font-semibold text-cream transition hover:border-amber hover:text-amber"
              >
                Та самая транзакция ↗
              </a>
              <a
                href={`https://solscan.io/account/${unreachable.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-4 py-2 text-sm font-semibold text-cream transition hover:border-amber hover:text-amber"
              >
                Кошелёк (баланс не меняется) ↗
              </a>
            </div>
            <p className="mt-3 break-all text-[11px] text-cream/40">{unreachable.address}</p>
          </div>
        )}
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
            {/* Сожжено считается как разница заявленной эмиссии и текущей по
                данным сети: у SPL-токена сжигание уменьшает supply, а выпустить
                новые нельзя — право mint отозвано. */}
            {burned !== null && burned > 0 ? (
              <>
                <p className="display mt-3 text-3xl font-extrabold text-copper">
                  {amount(burned)} $DOFFA
                </p>
                <p className="mt-2 text-xs text-cream/55">
                  Сожжено навсегда. Считается по эмиссии в сети: было{" "}
                  {ECOSYSTEM.token.totalSupply.toLocaleString("ru-RU")}, сейчас {amount(supply!.total)}.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-cream/70">
                  Сжигание выполняется проектом отдельной on-chain-операцией. Сожжённые
                  токены не поступают игрокам или в пул.
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-cream/50">
                  {supply
                    ? `Эмиссия в сети сейчас ${amount(supply.total)} — она равна первоначальной, значит подтверждённых сжиганий пока нет.`
                    : "Прочитать эмиссию из сети сейчас не удалось, поэтому объём сжигания не показываем."}{" "}
                  Статус — «{STATUS_LABEL_RU[burnStatus]}». Мы не обещаем, что сжигание уже активно.
                </p>
              </>
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
            { label: "Reward Vault (публичный адрес)", status: vaultStatus },
            { label: "Сжигание (on-chain burn)", status: burnStatus },
            { label: "DEX-пул DOFFA/SOL", status: dexStatus },
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

        {/* Данные из сети: эмиссия и права на выпуск/заморозку. Раньше сайт
            просто утверждал, что права отозваны, — теперь это подтверждается. */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Эмиссия в сети
            </p>
            {supply ? (
              <>
                <p className="display mt-2 text-2xl font-extrabold text-cream-soft">
                  {amount(supply.total)} $DOFFA
                </p>
                <p className="mt-2 text-[11px] text-cream/45">
                  Прочитано из блокчейна, {supply.decimals} знаков после запятой.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-cream/60">
                Сейчас не удалось прочитать эмиссию из сети.
              </p>
            )}
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Права на токен
            </p>
            {authorities === null ? (
              <p className="mt-2 text-sm text-cream/60">
                Сейчас не удалось проверить права через сеть.
              </p>
            ) : authoritiesRevoked ? (
              <>
                <p className="mt-2 text-sm font-semibold text-teal">
                  Выпуск и заморозка отозваны
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
                  Новые токены выпустить нельзя, заморозить чужие — тоже. Проверено
                  в сети, а не заявлено на словах.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-semibold text-amber">Права ещё не отозваны</p>
                <p className="mt-2 break-all text-[11px] leading-relaxed text-cream/45">
                  {authorities.mintAuthority && <>выпуск: {authorities.mintAuthority}<br /></>}
                  {authorities.freezeAuthority && <>заморозка: {authorities.freezeAuthority}</>}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Рыночная котировка. У $DOFFA она появится только когда будет создан
            пул ликвидности; до тех пор пишем об этом прямо, а не рисуем ноль
            или прочерк, который можно принять за цену. */}
        <div className="card mt-6 rounded-2xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
            Рыночная цена
          </p>
          {prices.doffaUsd !== null ? (
            <p className="display mt-2 text-2xl font-extrabold text-cream-soft">
              {formatUsd(prices.doffaUsd)}{" "}
              <span className="text-sm font-semibold text-cream/45">за $DOFFA</span>
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              У $DOFFA пока нет рыночной цены: пул ликвидности на DEX не создан
              (статус — «{STATUS_LABEL_RU[dexStatus]}»). Как только пул
              появится, котировка будет подтягиваться сюда автоматически.
            </p>
          )}
          {prices.solUsd !== null && (
            <p className="mt-3 text-[11px] text-cream/40">
              Для ориентира, SOL: {formatUsd(prices.solUsd)} · источник Jupiter, обновление раз в 5 минут
            </p>
          )}
        </div>
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
