// Тесты полного пути внешних интеграций: конфигурация → fetch → разбор.
// Сеть не используется — global fetch подменяется заглушкой, поэтому проверить
// можно и успешный ответ, и таймаут, и мусор от поставщика.
//
// Модули читают env на этапе импорта, поэтому переменные ставятся до
// динамического import().
import { test } from "node:test";
import assert from "node:assert/strict";

type FetchStub = (input: unknown, init?: unknown) => Promise<Response>;

const realFetch = globalThis.fetch;

function stubFetch(handler: (url: string) => { status?: number; body?: unknown } | "throw") {
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    const result = handler(url);
    if (result === "throw") throw new Error("network down");
    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as FetchStub as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = realFetch;
}

test("getWeather: координаты заданы и источник ответил — погода возвращается", async () => {
  process.env.WEATHER_LATITUDE = "44.2";
  process.env.WEATHER_LONGITUDE = "41.9";
  const { getWeather } = await import("../app/lib/external/weather");

  let requested = "";
  stubFetch((url) => {
    requested = url;
    return { body: { current: { temperature_2m: -2.7, weather_code: 71, is_day: 0 } } };
  });
  try {
    assert.deepEqual(await getWeather(), { tempC: -3, code: 71, isDay: false });
    // Координаты действительно уходят в запрос, а не теряются по дороге.
    assert.match(requested, /latitude=44\.2/);
    assert.match(requested, /longitude=41\.9/);
  } finally {
    restoreFetch();
  }
});

test("getWeather: источник упал — null, исключение наружу не летит", async () => {
  process.env.WEATHER_LATITUDE = "44.2";
  process.env.WEATHER_LONGITUDE = "41.9";
  const { getWeather } = await import("../app/lib/external/weather");

  stubFetch(() => "throw");
  try {
    assert.equal(await getWeather(), null);
  } finally {
    restoreFetch();
  }
});

test("getWeather: источник ответил 500 — null", async () => {
  // Координаты ставим и здесь: модуль кэшируется при первом импорте, и тест не
  // должен зависеть от того, что его сосед отработал раньше.
  process.env.WEATHER_LATITUDE = "44.2";
  process.env.WEATHER_LONGITUDE = "41.9";
  const { getWeather } = await import("../app/lib/external/weather");
  stubFetch(() => ({ status: 500, body: { error: "oops" } }));
  try {
    assert.equal(await getWeather(), null);
  } finally {
    restoreFetch();
  }
});

test("getRates: успешный ответ разбирается, эквивалент считается", async () => {
  const { getRates, convertMinor } = await import("../app/lib/external/fx");
  stubFetch(() => ({ body: { base_code: "RUB", rates: { USD: 0.01, EUR: 0.009 } } }));
  try {
    const rates = await getRates();
    assert.ok(rates);
    // 2500 копеек = 25 ₽ → 25 центов при курсе 0.01.
    assert.equal(convertMinor(2500, "RUB", "USD", rates), 25);
  } finally {
    restoreFetch();
  }
});

test("getTokenPrices: SOL есть, $DOFFA нет — цена токена остаётся null", async () => {
  const { getTokenPrices, SOL_MINT } = await import("../app/lib/external/price");
  // Реальная ситуация проекта: пул ликвидности $DOFFA не создан, поэтому
  // источник возвращает только SOL. Ноль подставлять нельзя.
  stubFetch(() => ({ body: { [SOL_MINT]: { usdPrice: 152.31 } } }));
  try {
    const prices = await getTokenPrices();
    assert.equal(prices.solUsd, 152.31);
    assert.equal(prices.doffaUsd, null);
  } finally {
    restoreFetch();
  }
});

test("getTokenPrices: источник недоступен — обе цены null, страница не падает", async () => {
  const { getTokenPrices } = await import("../app/lib/external/price");
  stubFetch(() => "throw");
  try {
    assert.deepEqual(await getTokenPrices(), { solUsd: null, doffaUsd: null });
  } finally {
    restoreFetch();
  }
});
