// Курсы валют — open.er-api.com (бесплатно, без ключа).
//
// Нужны, чтобы рядом с рублёвой ценой мерча показать примерный эквивалент в
// долларах/евро. Это ВСПОМОГАТЕЛЬНАЯ величина: реальная цена всегда та, что
// указана продавцом. Поэтому эквивалент подписан как приблизительный, и если
// курс недоступен — строка просто не показывается.

import { INTEGRATIONS } from "../../config/integrations.server";
import { asNumber, fetchJson, prop } from "./http";

export type Rates = {
  base: string;
  /** Курс: сколько единиц валюты за 1 единицу base. */
  rates: Record<string, number>;
};

/**
 * Разбирает ответ курсов. Принимает `rates` (open.er-api) и `conversion_rates`
 * (формат некоторых совместимых источников) — чтобы смена поставщика не
 * требовала правки вызывающего кода.
 */
export function parseRates(json: unknown, fallbackBase: string): Rates | null {
  const raw = prop(json, "rates") ?? prop(json, "conversion_rates");
  if (typeof raw !== "object" || raw === null) return null;

  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = asNumber(value);
    // Ноль и отрицательные курсы бессмысленны — такие записи отбрасываем.
    if (n !== null && n > 0) rates[code.toUpperCase()] = n;
  }
  if (Object.keys(rates).length === 0) return null;

  const base = prop(json, "base_code") ?? prop(json, "base");
  return { base: (typeof base === "string" && base.trim() ? base : fallbackBase).toUpperCase(), rates };
}

/**
 * Переводит сумму в минорных единицах (копейки/центы) из одной валюты в другую.
 * null — если нужного курса нет; выдумывать эквивалент нельзя.
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rates: Rates,
): number | null {
  if (!Number.isFinite(amountMinor)) return null;
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return Math.round(amountMinor);

  // Курсы даны относительно rates.base, поэтому переводим через базу.
  const perFrom = f === rates.base ? 1 : rates.rates[f];
  const perTo = t === rates.base ? 1 : rates.rates[t];
  if (!perFrom || !perTo) return null;

  return Math.round((amountMinor / perFrom) * perTo);
}

/** Курсы к базовой валюте. null — интеграция выключена или источник недоступен. */
export async function getRates(): Promise<Rates | null> {
  const { enabled, baseCurrency } = INTEGRATIONS.fx;
  if (!enabled) return null;

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`;
  // 6 часов: курс для справочной строки на витрине чаще не нужен.
  return parseRates(await fetchJson(url, { revalidate: 21600 }), baseCurrency);
}
