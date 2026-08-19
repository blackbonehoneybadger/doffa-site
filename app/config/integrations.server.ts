import "server-only";

// СЕРВЕРНАЯ конфигурация внешних интеграций (погода, курсы валют, котировки).
// Импортировать ТОЛЬКО из серверного кода (route handlers, server components,
// app/lib/**) — по той же договорённости, что и merch.server.ts. Приватных
// ключей здесь нет: единственный ключ (котировки) необязателен и живёт в
// не-публичной env.
//
// Принцип тот же, что во всём проекте: не настроено → функция выключена и на
// сайте её просто нет. Никаких выдуманных значений по умолчанию.

function envStr(v: string | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

/** Координата из env. Возвращает null, если не задана или вне допустимого диапазона. */
function coord(v: string | undefined, limit: number): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

const lat = coord(process.env.WEATHER_LATITUDE, 90);
const lon = coord(process.env.WEATHER_LONGITUDE, 180);

export const INTEGRATIONS = {
  weather: {
    // Координаты кофейни. Намеренно без значения по умолчанию: подставлять
    // выдуманные координаты аула нельзя, а неверные показали бы чужую погоду.
    latitude: lat,
    longitude: lon,
    /** Погода показывается только когда обе координаты реально заданы. */
    enabled: lat !== null && lon !== null,
  },
  fx: {
    // Курсы валют — бесплатный публичный источник, ключ не нужен.
    // Выключается через FX_RATES_ENABLED=false, если источник начнёт мешать.
    enabled: (process.env.FX_RATES_ENABLED ?? "true").trim() !== "false",
    baseCurrency: envStr(process.env.FX_BASE_CURRENCY) ?? "RUB",
  },
  price: {
    // Котировки SOL и $DOFFA. Ключ необязателен (публичный источник работает
    // без него) — переменная та же, что уже заведена под маркетплейс.
    apiKey: envStr(process.env.DOFFA_PRICE_PROVIDER_API_KEY),
    enabled: (process.env.TOKEN_PRICE_ENABLED ?? "true").trim() !== "false",
  },
} as const;
