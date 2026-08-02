// Котировки Solana и $DOFFA — Jupiter Price API (публичный, без ключа).
//
// ВАЖНО про $DOFFA. Цена у токена появляется только когда есть пул ликвидности
// на DEX. Пока пул не создан (см. ECOSYSTEM.status.dex — «Готовится»),
// источник не вернёт по нему ничего, и это НОРМАЛЬНОЕ состояние, а не сбой.
// Подставлять сюда любое число — значит нарисовать несуществующий курс, поэтому
// при отсутствии котировки возвращается null, а страница пишет об этом прямо.

import { INTEGRATIONS } from "../../config/integrations.server";
import { ECOSYSTEM } from "../../config/ecosystem";
import { asNumber, fetchJson, prop } from "./http";

/** Мятный адрес wrapped SOL — общепринятая константа Solana. */
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export type TokenPrices = {
  /** Цена SOL в USD. null — источник недоступен. */
  solUsd: number | null;
  /** Цена $DOFFA в USD. null — рыночной цены нет (пула нет) или источник недоступен. */
  doffaUsd: number | null;
};

/**
 * Достаёт цену конкретного mint из ответа. Терпим к формам ответа: плоская
 * карта `{ mint: { usdPrice } }` (v3) и вложенная `{ data: { mint: { price } } }`
 * (v2). Отсутствие записи — это null, а не ноль: ноль на витрине читался бы как
 * «токен ничего не стоит».
 */
export function parseTokenPrice(json: unknown, mint: string): number | null {
  const flat = prop(json, mint);
  const nested = prop(prop(json, "data"), mint);
  const entry = flat ?? nested;
  if (!entry) return null;

  const price = asNumber(prop(entry, "usdPrice") ?? prop(entry, "price"));
  // Ноль и отрицательные значения котировкой не считаем.
  return price !== null && price > 0 ? price : null;
}

/** Форматирует цену в USD: дешёвые токены требуют больше знаков после запятой. */
export function formatUsd(price: number): string {
  const digits = price >= 1 ? 2 : price >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price);
}

/** Котировки SOL и $DOFFA. Обе части независимы: SOL может быть, а DOFFA — нет. */
export async function getTokenPrices(): Promise<TokenPrices> {
  const empty: TokenPrices = { solUsd: null, doffaUsd: null };
  if (!INTEGRATIONS.price.enabled) return empty;

  const mint = ECOSYSTEM.token.mint;
  // Токен ещё не выпущен — котировать нечего. Спрашивать цену несуществующего
  // mint бессмысленно, а подставить старый значило бы показать чужую цену
  // как цену DOFFA. SOL при этом всё равно отдаём: он от токена не зависит.
  if (mint === null) {
    const solOnly = await fetchJson(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`, {
      revalidate: 300,
      headers: INTEGRATIONS.price.apiKey ? { "x-api-key": INTEGRATIONS.price.apiKey } : undefined,
    });
    return solOnly === null ? empty : { solUsd: parseTokenPrice(solOnly, SOL_MINT), doffaUsd: null };
  }

  const url = `https://lite-api.jup.ag/price/v3?ids=${SOL_MINT},${encodeURIComponent(mint)}`;
  const headers = INTEGRATIONS.price.apiKey
    ? { "x-api-key": INTEGRATIONS.price.apiKey }
    : undefined;

  // 5 минут: чаще обновлять справочную котировку на сайте кофейни незачем.
  const json = await fetchJson(url, { revalidate: 300, headers });
  if (json === null) return empty;

  return {
    solUsd: parseTokenPrice(json, SOL_MINT),
    doffaUsd: parseTokenPrice(json, mint),
  };
}
