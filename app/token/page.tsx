import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";
import {
  burnedFromSupply,
  getMintAuthorities,
  getSupply,
  getTokenBalance,
} from "../lib/solana/chain";

export const metadata: Metadata = {
  title: "Токен DOFFA — эмиссия, права, проверка в сети · DOFFA Games",
  description:
    "Все параметры токена DOFFA: эмиссия, decimals, права на выпуск и заморозку, адрес mint и кошелька владельца. Только данные из блокчейна, без выдуманных адресов.",
  alternates: { canonical: "/token" },
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

/** Строка «параметр → значение». value = null → честный прочерк, а не выдумка. */
function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/8 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="shrink-0 text-sm text-cream/60">{label}</span>
      <span className="break-all text-right text-sm font-semibold text-cream-soft sm:max-w-[60%]">
        {value ?? <span className="text-cream/35">—</span>}
        {hint && <span className="mt-0.5 block text-[11px] font-normal text-cream/40">{hint}</span>}
      </span>
    </div>
  );
}

function num(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: n % 1 === 0 ? 0 : 6 });
}

export default async function TokenPage() {
  const t = ECOSYSTEM.token;
  const owner = ECOSYSTEM.ownerWallet;

  // Пока mint не создан, в сеть не ходим вообще: спрашивать нечего.
  // Подставить старый mint, чтобы «было что показать», нельзя — страница
  // выдала бы данные деприкированного токена за данные действующего.
  const [supply, authorities, ownerBalance] = await Promise.all([
    t.mint ? getSupply(t.mint) : Promise.resolve(null),
    t.mint ? getMintAuthorities(t.mint) : Promise.resolve(null),
    t.mint ? getTokenBalance(owner, t.mint) : Promise.resolve(null),
  ]);

  const burned = burnedFromSupply(t.initialSupply, supply);
  const deployed = t.mint !== null;

  const mintAuthority = authorities ? authorities.mintAuthority : null;
  const freezeAuthority = authorities ? authorities.freezeAuthority : null;
  const authoritiesKnown = authorities !== null;
  const revoked = authoritiesKnown && mintAuthority === null && freezeAuthority === null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <Kicker>{ECOSYSTEM.productName} · TOKEN</Kicker>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="display text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
          DOFFA
        </h1>
        <StatusBadge status={ECOSYSTEM.status.token} />
      </div>

      {/* ── Статус выпуска ───────────────────────────────────────────── */}
      {!deployed && (
        <div className="card mt-8 rounded-2xl border border-amber/25 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber">
            Status: Mainnet token not deployed yet
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            Токен DOFFA в основной сети Solana <b className="text-cream-soft">ещё не создан</b>.
            Адреса mint не существует, поэтому мы его не показываем — ни настоящего, ни
            «временного». Цифры ниже помечены как заявленные параметры будущего выпуска,
            а не как факт из блокчейна.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            Как только выпуск состоится, здесь появятся адрес mint, реальная эмиссия из
            сети, состояние прав и ссылки на explorer — всё проверяемое без доверия к нам.
          </p>
        </div>
      )}

      {/* ── Параметры токена ─────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">Параметры</h2>
        <div className="card mt-4 rounded-2xl px-6 py-2">
          <Row label="Name" value="DOFFA" />
          <Row label="Symbol" value="DOFFA" />
          <Row label="Network" value={t.network} />
          <Row label="Decimals" value={String(t.decimals)} />
          <Row
            label="Initial supply"
            value={`${num(t.initialSupply)} DOFFA`}
            hint={deployed ? undefined : "заявленный параметр будущего выпуска"}
          />
          <Row
            label="Current supply"
            value={supply ? `${num(supply.total)} DOFFA` : null}
            hint={deployed ? "прочитано из блокчейна" : "токен не создан — читать нечего"}
          />
          <Row
            label="Total burned"
            value={burned !== null ? `${num(burned)} DOFFA` : null}
            hint={
              deployed
                ? "разница заявленной эмиссии и текущей в сети"
                : "появится после выпуска"
            }
          />
          <Row
            label="Mint address"
            value={t.mint}
            hint={deployed ? undefined : "не существует, пока токен не выпущен"}
          />
          <Row label="Owner wallet" value={owner} hint="единственный управляемый кошелёк проекта" />
          <Row
            label="Баланс владельца"
            value={ownerBalance !== null ? `${num(ownerBalance)} DOFFA` : null}
            hint={deployed ? "прочитано из блокчейна" : undefined}
          />
          <Row
            label="Metadata URI"
            value={t.metadataUri}
            hint={t.metadataUri ? undefined : "постоянный URI (IPFS/Arweave) ещё не загружен"}
          />
        </div>
      </section>

      {/* ── Права на токен ───────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">Права на токен</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Mint authority
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-cream-soft">
              {!authoritiesKnown ? (
                <span className="text-cream/40">
                  {deployed ? "не удалось прочитать из сети" : "—"}
                </span>
              ) : mintAuthority === null ? (
                <span className="text-teal">None — отозван навсегда</span>
              ) : (
                <span className="text-amber">{mintAuthority}</span>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
              Пока право активно, владелец может выпустить новые токены. После отзыва это
              невозможно навсегда и ни для кого.
            </p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Freeze authority
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-cream-soft">
              {!authoritiesKnown ? (
                <span className="text-cream/40">
                  {deployed ? "не удалось прочитать из сети" : "—"}
                </span>
              ) : freezeAuthority === null ? (
                <span className="text-teal">None — отозван навсегда</span>
              ) : (
                <span className="text-amber">{freezeAuthority}</span>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
              Пока право активно, владелец может заморозить чужой токен-аккаунт. После
              отзыва — не может никто.
            </p>
          </div>
        </div>
        {revoked && (
          <p className="mt-3 text-xs text-teal">
            Оба права отозваны — параметры токена зафиксированы навсегда и проверяются в сети.
          </p>
        )}
      </section>

      {/* ── Explorer ─────────────────────────────────────────────────── */}
      {deployed && (
        <section className="mt-10">
          <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">Проверить в сети</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={t.solscanUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
            >
              Токен в Solscan ↗
            </a>
            <a
              href={`https://solscan.io/account/${owner}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-5 py-2 text-sm font-semibold text-cream transition hover:border-amber hover:text-amber"
            >
              Кошелёк владельца ↗
            </a>
          </div>
        </section>
      )}

      {/* ── DOFFA ≠ Beans ────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="display text-2xl font-bold text-cream-soft sm:text-3xl">
          DOFFA и Beans — это не одно и то же
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="display text-xl font-bold text-cream-soft">Beans</p>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              Внутренняя игровая энергия. Копятся тапами в DOFFA Shelf и тратятся на вход и
              действия в Arena и Heroes.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-cream/55">
              <li>· не криптовалюта и не токен;</li>
              <li>· не существуют в блокчейне;</li>
              <li>· не продаются и не выводятся;</li>
              <li>· не имеют курса и цены.</li>
            </ul>
          </div>
          <div className="card rounded-2xl p-6">
            <p className="display text-xl font-bold text-gold">DOFFA</p>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              SPL-токен в сети Solana с ограниченной эмиссией. Начисляется за игровые
              достижения по прозрачным правилам.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-cream/55">
              <li>· существует on-chain, каждая операция видна;</li>
              <li>· эмиссия ограничена {num(t.initialSupply)};</li>
              <li>· уменьшается только реальным burn в блокчейне;</li>
              <li>· хранится в твоём кошельке, а не у нас.</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-cream/45">
          Мы не обещаем, что цена DOFFA будет расти, и не гарантируем доход. Сжигание
          уменьшает количество токенов в сети — это факт, проверяемый в explorer, но
          не обещание какой-либо цены.
        </p>
      </section>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/transparency" className="text-sm font-semibold text-gold transition hover:text-amber">
          Прозрачность
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
