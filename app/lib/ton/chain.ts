// Чтение реальных данных DOFF из сети TON — серверная сторона.
//
// Правило то же, что и у остальных внешних источников: нет ответа — null.
// Ни одна цифра на странице не должна быть придуманной, поэтому недоступный
// узел означает «данных нет», а не «ноль». Ноль и «неизвестно» — разные вещи,
// и путать их на странице про деньги нельзя.
//
// Приватные ключи здесь не используются и не могут: всё это операции чтения.
// Подписывать переводы сайт не умеет — это делает отправитель выплат в игре,
// ключом, который живёт только в секретах.
//
// Ключ к API читается из НЕ-публичной переменной TONAPI_KEY, чтобы он не попал
// в браузерный bundle. Без ключа публичный предел запросов тоже работает — для
// сайта с кэшем в десять минут его хватает с запасом.

import { asNumber, fetchJson, prop } from "../external/http";

const BASE = "https://tonapi.io/v2";

function headers(): Record<string, string> | undefined {
  const key = process.env.TONAPI_KEY?.trim();
  return key ? { authorization: `Bearer ${key}` } : undefined;
}

/** Переводит сумму в базовых единицах в человекочитаемую по decimals. */
export function toUiAmount(raw: string | number, decimals: number): number | null {
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) return null;
  // Целая и дробная части считаются отдельно: у миллиарда с девятью знаками
  // после запятой это 10^18 базовых единиц, и в Number целиком оно не влезает.
  const целая = s.length > decimals ? s.slice(0, s.length - decimals) : "0";
  const дробная = (decimals === 0 ? "" : s.slice(-decimals).padStart(decimals, "0")).replace(/0+$/, "");
  const n = Number(дробная ? `${целая}.${дробная}` : целая);
  return Number.isFinite(n) ? n : null;
}

export type JettonInfo = {
  /** Эмиссия сейчас, по данным сети. Сжигание её уменьшает. */
  totalSupply: number;
  decimals: number;
  symbol: string | null;
  /**
   * Может ли кто-нибудь выпустить ещё. false — допечатка закрыта навсегда.
   */
  mintable: boolean;
  /**
   * Адрес администратора контракта. null — права сняты: менять контракт и его
   * метаданные больше не может никто, включая владельца.
   */
  admin: string | null;
};

/** Разбор ответа /v2/jettons/{master}. Чужая форма ответа — это null. */
export function parseJetton(json: unknown): JettonInfo | null {
  const meta = prop(json, "metadata");
  const decimals = asNumber(prop(meta, "decimals"));
  if (decimals === null) return null;
  const totalSupply = toUiAmount(String(prop(json, "total_supply") ?? ""), Math.trunc(decimals));
  if (totalSupply === null) return null;
  const symbol = prop(meta, "symbol");
  const admin = prop(prop(json, "admin"), "address");
  const mintable = prop(json, "mintable");
  return {
    totalSupply,
    decimals: Math.trunc(decimals),
    symbol: typeof symbol === "string" ? symbol : null,
    // Поля нет — считаем, что допечатка возможна: это осторожная сторона
    // ошибки. Обещать «выпустить больше нельзя» без подтверждения нельзя.
    mintable: mintable !== false,
    admin: typeof admin === "string" && admin ? admin : null,
  };
}

/** Данные мастер-контракта DOFF. null — узел недоступен. */
export async function getJetton(master: string): Promise<JettonInfo | null> {
  // 10 минут: эмиссия меняется только при сжигании, а админ — один раз в жизни.
  return parseJetton(await fetchJson(`${BASE}/jettons/${encodeURIComponent(master)}`, {
    revalidate: 600,
    headers: headers(),
  }));
}

/** Разбор ответа /v2/accounts/{owner}/jettons/{master}. */
export function parseJettonBalance(json: unknown, decimals: number): number | null {
  const raw = prop(json, "balance");
  if (raw === undefined || raw === null) return null;
  return toUiAmount(String(raw), decimals);
}

/**
 * Баланс DOFF у адреса — например, у фонда наград.
 * null означает «узел не ответил», а не «пусто»: настоящий ноль вернётся нулём.
 */
export async function getJettonBalance(
  owner: string,
  master: string,
  decimals: number,
): Promise<number | null> {
  // 5 минут: остаток фонда меняется при выплатах.
  const json = await fetchJson(
    `${BASE}/accounts/${encodeURIComponent(owner)}/jettons/${encodeURIComponent(master)}`,
    { revalidate: 300, headers: headers() },
  );
  return parseJettonBalance(json, decimals);
}

/**
 * Сколько DOFF сожжено — как разница между выпущенной эмиссией и текущей.
 *
 * Для Jetton сжигание уменьшает эмиссию в сети, а выпустить новые нельзя, если
 * админ снят, — поэтому разница и есть объём сжигания. Это проверяет любой, не
 * доверяя нам ни в чём.
 *
 * null — если текущая эмиссия неизвестна. Отрицательный результат означает, что
 * заявленная эмиссия не сходится с сетью: тогда честнее не показывать ничего,
 * чем показать минус.
 */
export function burnedFromSupply(issuedSupply: number, current: JettonInfo | null): number | null {
  if (!current) return null;
  const burned = issuedSupply - current.totalSupply;
  return burned >= 0 ? burned : null;
}

/**
 * Дневной пул фонда: доля остатка, которую фонд отдаёт за сутки.
 *
 * Та же формула, что в игре (server/emission.mjs). Отсюда главное свойство
 * экономики: Ф(n) = Ф₀·(1−p)ⁿ строго больше нуля при любом n — фонд не
 * кончается, а не «надолго хватает».
 */
export function dailyPool(vaultBalance: number, denominator: number): number | null {
  if (!Number.isFinite(vaultBalance) || vaultBalance < 0) return null;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  return vaultBalance / denominator;
}

/**
 * Равновесный остаток фонда: тот, при котором дневной пул ровно равен притоку
 * от сжигания и призов. Ниже него фонд растёт, выше — тает; ни в ту, ни в
 * другую сторону он не убегает.
 */
export function equilibrium(dailyInflow: number, denominator: number): number | null {
  if (!Number.isFinite(dailyInflow) || dailyInflow < 0) return null;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  return dailyInflow * denominator;
}
