import type { Metadata } from "next";
import Link from "next/link";
import { ECOSYSTEM, STATUS_LABEL_RU, type FeatureStatus } from "../config/ecosystem";
import {
  burnedFromSupply,
  dailyPool,
  equilibrium,
  getJetton,
  getJettonBalance,
} from "../lib/ton/chain";

export const metadata: Metadata = {
  title: "Прозрачность — фонд наград и сжигание · DOFFA Games",
  description:
    "Как устроена экономика DOFF: фонд наград, дневной пул, сжигание и призовой фонд. Только реальные данные из сети TON и честные статусы — без придуманных адресов и цифр.",
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
  const токен = ECOSYSTEM.token;
  const фонд = ECOSYSTEM.rewardVault;
  const ЭК = ECOSYSTEM.economy;
  // Реальные данные из сетей. Каждая часть независима: недоступность одной не
  // мешает показать остальные, а null означает «данных нет» — не «ноль».
  const [jetton, vaultBalance] = await Promise.all([
    getJetton(токен.master),
    getJettonBalance(фонд.address, токен.master, токен.decimals),
  ]);

  // Сожжено = выпущенная эмиссия минус текущая по данным сети.
  const burned = burnedFromSupply(токен.totalSupply, jetton);

  // Статусы не берутся из env вслепую там, где сеть может ответить сама.
  const burnStatus: FeatureStatus = burned !== null && burned > 0 ? "live" : ECOSYSTEM.status.burn;
  const vaultStatus: FeatureStatus = vaultBalance !== null ? "live" : ECOSYSTEM.status.rewardVault;
  // Пул на бирже: статус берётся из настроек. Спросить у сети «есть ли пул»
  // сайт не может — обменники TON у каждого свои, и молчание одного из них
  // ничего не доказывает. Появится пул — владелец ставит статус и ссылку.
  const dexStatus: FeatureStatus = ECOSYSTEM.status.dex;

  // Дневной пул и равновесие считаются от настоящего остатка фонда, а не от
  // числа в конфигурации. Нет остатка — нет и цифр: врать нечем.
  const пул = vaultBalance !== null ? dailyPool(vaultBalance, ЭК.poolDenominator) : null;

  // Прогноз без притока вовсе — нарочно худший случай: игра не зарабатывает
  // ничего, фонд только тратится. Считается той же формулой, что в игре.
  const через = (суток: number): number | null =>
    vaultBalance === null ? null : vaultBalance * Math.pow(1 - 1 / ЭК.poolDenominator, суток);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-24 pt-28">
      <Kicker>{ECOSYSTEM.productName} · TRANSPARENCY</Kicker>
      <h1 className="display mt-4 text-5xl font-extrabold leading-[0.98] tracking-tight text-cream-soft sm:text-6xl">
        Прозрачность
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/75">
        Награды не создаются из воздуха — они выплачиваются из{" "}
        <b className="text-cream-soft">фонда наград</b> в сети TON. Здесь только реальные
        данные и честные статусы, в том числе неудобные: что не работает, названо не
        работающим, а каждая цифра либо прочитана из сети, либо не показана вовсе.
      </p>

      {/* ТОКЕН DOFF */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">
            {токен.symbol} в {токен.network}
          </h2>
          <StatusBadge status={ECOSYSTEM.status.token} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Стандарт {токен.standard}. У монеты один-единственный настоящий адрес — по нему
          кошелёк отличает {токен.symbol} от подделки с тем же тикером. Сверяйте всегда его,
          а не название.
        </p>
        <a
          href={токен.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
        >
          Открыть {токен.symbol} в обозревателе ↗
        </a>
        <p className="mt-3 break-all text-[11px] text-cream/40">контракт: {токен.master}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Эмиссия в сети
            </p>
            {jetton ? (
              <>
                <p className="display mt-2 text-2xl font-extrabold text-cream-soft">
                  {amount(jetton.totalSupply)} {токен.symbol}
                </p>
                <p className="mt-2 text-[11px] text-cream/45">
                  Прочитано из сети прямо сейчас, {jetton.decimals} знаков после запятой.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-cream/60">
                Сейчас не удалось прочитать эмиссию из сети. Показывать вместо неё
                какое-либо число мы не будем — проверьте по ссылке выше.
              </p>
            )}
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">
              Права на контракт
            </p>
            {jetton === null ? (
              <p className="mt-2 text-sm text-cream/60">Сейчас не удалось проверить права через сеть.</p>
            ) : (
              <>
                <p className={`mt-2 text-sm font-semibold ${jetton.mintable ? "text-amber" : "text-teal"}`}>
                  {jetton.mintable ? "Допечатка ещё возможна" : "Допечатка закрыта навсегда"}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
                  {jetton.admin === null ? (
                    <>
                      Администратор контракта снят: менять контракт и его метаданные больше
                      не может никто, включая владельца проекта. Проверено в сети, а не
                      заявлено на словах.
                    </>
                  ) : (
                    <>
                      Администратор контракта пока сохранён. Он не позволяет выпускать новые{" "}
                      {токен.symbol} сверх эмиссии, но позволяет менять метаданные. Снятие
                      прав — отдельная необратимая операция.
                      <br />
                      <span className="break-all">админ: {jetton.admin}</span>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ФОНД НАГРАД */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Фонд наград</h2>
          <StatusBadge status={vaultStatus} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Из этого кошелька игра платит за обменянные зёрна. Адрес публичный — остаток
          смотрит кто угодно и когда угодно. Ключ от него живёт только в секретах и никогда
          не попадает ни в репозиторий, ни в журналы, ни в отчёты.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Остаток фонда</p>
            {vaultBalance !== null ? (
              <>
                <p className="display mt-2 text-3xl font-extrabold text-cream-soft">
                  {amount(vaultBalance)} {токен.symbol}
                </p>
                <p className="mt-2 text-xs text-cream/50">Прочитано из сети, а не записано в конфиг.</p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Адрес фонда опубликован, но прочитать остаток из сети сейчас не удалось.
                Показывать вместо него какое-либо число мы не будем — проверьте напрямую.
              </p>
            )}
            <a
              href={фонд.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
            >
              Проверить фонд ↗
            </a>
            <p className="mt-3 break-all text-[11px] text-cream/40">{фонд.address}</p>
          </div>

          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
              Дневной пул
            </p>
            {пул !== null ? (
              <>
                <p className="display mt-2 text-3xl font-extrabold text-cream-soft">
                  {amount(пул)} {токен.symbol}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-cream/50">
                  Столько фонд отдаёт игрокам за сегодняшние сутки — это ровно{" "}
                  1/{ЭК.poolDenominator.toLocaleString("ru-RU")} остатка, и ни единицей больше.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Пул считается от настоящего остатка фонда. Пока остаток не прочитан из сети,
                показывать тут нечего.
              </p>
            )}
          </div>
        </div>

        {/* ПОЧЕМУ ФОНД НЕ КОНЧАЕТСЯ. Это главное утверждение всей страницы, и
            оно держится на арифметике, а не на обещании. Формула та же, что в
            коде игры (server/emission.mjs), и её может проверить любой. */}
        <div className="card mt-4 rounded-2xl border border-teal/25 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">
            Почему фонд не кончается
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/75">
            Фонд отдаёт в сутки не число монет, а <b className="text-cream-soft">долю самого себя</b>.
            Отсюда прямое следствие: Ф(n) = Ф₀ · (1 − p)<sup>n</sup> строго больше нуля при
            любом n. Это не «надолго хватит» — это «не кончается в принципе».
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/75">
            Так было не всегда. При постоянном курсе «1 000 зёрен → 1 {токен.symbol}» и
            дневном потолке {ЭК.dailyBeanCap.toLocaleString("ru-RU")} зёрен один аккаунт
            забирал бы 25 {токен.symbol} в сутки: тысяча игроков вынесла бы фонд в миллион за
            сорок суток, десять тысяч — за четверо. Чем лучше шли бы дела, тем быстрее игра
            убивала бы себя. Теперь этого не может случиться математически.
          </p>

          {vaultBalance !== null && (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              <p className="bg-white/[0.03] px-4 py-2 text-[11px] leading-relaxed text-cream/45">
                Худший случай: игра не зарабатывает вообще ничего, фонд только тратится.
              </p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/10">
                  {[
                    { t: "через год", d: 365 },
                    { t: "через 5 лет", d: 1825 },
                    { t: "через 10 лет", d: 3650 },
                    { t: "через 50 лет", d: 18250 },
                  ].map((r) => (
                    <tr key={r.d} className="bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-cream/60">{r.t}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="display font-bold text-cream-soft">
                          {amount(через(r.d)!)} {токен.symbol}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm leading-relaxed text-cream/75">
            И это без притока. А приток есть: {ЭК.fight.burn} % с банка каждого боя и{" "}
            {ЭК.withdrawal.prize} % с каждого вывода возвращаются в фонд. Когда приток
            сравнивается с пулом, фонд перестаёт таять вовсе и живёт с оборота. Точка
            равновесия — приток, умноженный на {ЭК.poolDenominator.toLocaleString("ru-RU")}:
            например,{" "}
            <b className="text-cream-soft">
              {amount(equilibrium(1000, ЭК.poolDenominator)!)} {токен.symbol}
            </b>{" "}
            в фонде держатся неподвижно при 1 000 {токен.symbol} притока в сутки.
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-cream/45">
            Курс «зёрна → {токен.symbol}» пересчитывается раз в сутки: пул делится на
            вчерашний спрос. Внутри суток курс постоянен — игрок видит число до нажатия.
            Шаг заперт множителем два в обе стороны, поэтому ни тихий день, ни наплыв не
            дают качелей.
          </p>
        </div>
      </section>

      {/* СЖИГАНИЕ И ПРИЗОВОЙ ФОНД */}
      <section className="mt-14">
        <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">
          Сжигание и призовой фонд
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
              Как делится каждая сумма
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-cream/60">Банк боя на {токен.symbol}</dt>
                <dd className="mt-1 text-cream-soft">
                  <b className="text-teal">{ЭК.fight.winner} %</b> победителю ·{" "}
                  <b className="text-copper">{ЭК.fight.burn} %</b> сгорает ·{" "}
                  <b className="text-gold">{ЭК.fight.prize} %</b> в призовой фонд
                </dd>
              </div>
              <div>
                <dt className="text-cream/60">Вывод на свой кошелёк</dt>
                <dd className="mt-1 text-cream-soft">
                  <b className="text-teal">{ЭК.withdrawal.player} %</b> игроку ·{" "}
                  <b className="text-copper">{ЭК.withdrawal.burn} %</b> сгорает ·{" "}
                  <b className="text-gold">{ЭК.withdrawal.prize} %</b> в призовой фонд
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-cream/45">
              Округление названо прямо: сжигание и приз считаются вниз, а весь остаток до
              последней единицы достаётся человеку. Иначе округление работало бы против него,
              а «пыль» копилась бы у нас — незаметно и постоянно.
            </p>
          </div>
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Сожжено</p>
              <StatusBadge status={burnStatus} />
            </div>
            {burned !== null && burned > 0 ? (
              <>
                <p className="display mt-3 text-3xl font-extrabold text-copper">
                  {amount(burned)} {токен.symbol}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-cream/55">
                  Уничтожено навсегда. Считается по эмиссии в сети: выпущено{" "}
                  {токен.totalSupply.toLocaleString("ru-RU")}, сейчас {amount(jetton!.totalSupply)}.
                  Это настоящее сжигание — оно уменьшает эмиссию, и его проверяет любой,
                  не доверяя нам ни в чём.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                {jetton
                  ? `Эмиссия в сети сейчас ${amount(jetton.totalSupply)} — она равна выпущенной, значит подтверждённых сжиганий пока нет.`
                  : "Прочитать эмиссию из сети сейчас не удалось, поэтому объём сжигания не показываем."}{" "}
                Сжигание начнётся вместе с обменом: статус — «{STATUS_LABEL_RU[burnStatus]}». Мы
                не обещаем, что оно уже идёт.
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
            { label: `Игра ${ECOSYSTEM.primaryGameName} в Telegram`, status: ECOSYSTEM.status.game },
            { label: `Токен ${токен.symbol} выпущен в ${токен.network}`, status: ECOSYSTEM.status.token },
            { label: "Фонд наград (публичный адрес)", status: vaultStatus },
            { label: `Обмен зёрен на ${токен.symbol}`, status: ECOSYSTEM.status.exchange },
            { label: "Вывод на свой кошелёк", status: ECOSYSTEM.status.claims },
            { label: "Сжигание в сети", status: burnStatus },
            { label: `Пул на бирже (${токен.symbol})`, status: dexStatus },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 bg-white/[0.02] px-5 py-3">
              <span className="text-sm text-cream/75">{r.label}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-cream/45">
          Почему обмен и вывод — не «работает», хотя монета выпущена. Игра списывает зёрна и
          ставит заявку в очередь, а платит по ней отправитель, подписывающий перевод ключом
          фонда. Ключ не попадает в репозиторий, и пока он не положен в секреты, платить
          некому: включить флаг значило бы копить заявки, по которым никто не платит. Обмен
          открывают четыре условия сразу, а не правка одной строки.
        </p>
      </section>

      {/* РЫНОЧНАЯ ЦЕНА. Её нет, и это главное, что нужно сказать прямо. */}
      <section className="mt-14">
        <h2 className="display text-3xl font-bold text-cream-soft sm:text-4xl">Рыночная цена</h2>
        <div className="card mt-6 rounded-2xl p-5">
          <p className="text-sm leading-relaxed text-cream/70">
            У {токен.symbol} нет рыночной цены: пул ликвидности на бирже не создан
            (статус — «{STATUS_LABEL_RU[dexStatus]}»). Рисовать вместо цены ноль или
            прочерк, который можно принять за котировку, мы не будем. Появится пул —
            здесь появится ссылка на него.
          </p>
        </div>
      </section>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-center">
        <Link href="/game" className="text-sm font-semibold text-gold transition hover:text-amber">
          ← {ECOSYSTEM.primaryGameName}
        </Link>
        <Link href="/" className="text-sm font-semibold text-gold transition hover:text-amber">
          На главную doffa.coffee
        </Link>
      </div>
    </main>
  );
}
