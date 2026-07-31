// Тесты разбора ответов внешних API. Сеть здесь не используется: проверяются
// чистые функции на фикстурах — включая случаи, когда поставщик отдал мусор.
// Главное, что проверяем: при непонятном ответе получается null, а не
// правдоподобное выдуманное число.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWeather, weatherLabelRu, weatherIcon } from "../app/lib/external/weather";
import { parseRates, convertMinor, type Rates } from "../app/lib/external/fx";
import { parseTokenPrice, formatUsd, SOL_MINT } from "../app/lib/external/price";

// --- Погода ---------------------------------------------------------------

test("parseWeather: современный формат Open-Meteo", () => {
  const w = parseWeather({ current: { temperature_2m: -3.4, weather_code: 71, is_day: 0 } });
  assert.deepEqual(w, { tempC: -3, code: 71, isDay: false });
});

test("parseWeather: старый формат current_weather", () => {
  const w = parseWeather({ current_weather: { temperature: 18.6, weathercode: 2, is_day: 1 } });
  assert.deepEqual(w, { tempC: 19, code: 2, isDay: true });
});

test("parseWeather: без is_day считаем, что день", () => {
  assert.equal(parseWeather({ current: { temperature_2m: 5, weather_code: 0 } })?.isDay, true);
});

test("parseWeather: мусор и отсутствие температуры → null", () => {
  assert.equal(parseWeather(null), null);
  assert.equal(parseWeather({}), null);
  assert.equal(parseWeather({ current: {} }), null);
  assert.equal(parseWeather({ current: { temperature_2m: "жарко" } }), null);
  assert.equal(parseWeather("<html>502</html>"), null);
});

test("parseWeather: температура 0 не теряется", () => {
  // 0 — валидная температура; частая ошибка — отбросить её как falsy.
  assert.equal(parseWeather({ current: { temperature_2m: 0, weather_code: 3 } })?.tempC, 0);
});

test("weatherLabelRu/weatherIcon: коды WMO раскладываются по диапазонам", () => {
  assert.equal(weatherLabelRu(0), "ясно");
  assert.equal(weatherLabelRu(3), "пасмурно");
  assert.equal(weatherLabelRu(75), "снег");
  assert.equal(weatherLabelRu(95), "гроза");
  // Ночью ясное небо — луна, а не солнце.
  assert.equal(weatherIcon(0, false), "🌙");
  assert.equal(weatherIcon(0, true), "☀️");
});

// --- Курсы валют ----------------------------------------------------------

test("parseRates: формат open.er-api", () => {
  const r = parseRates({ result: "success", base_code: "RUB", rates: { USD: 0.011, EUR: 0.0102 } }, "RUB");
  assert.equal(r?.base, "RUB");
  assert.equal(r?.rates.USD, 0.011);
});

test("parseRates: альтернативное имя поля conversion_rates", () => {
  const r = parseRates({ base: "rub", conversion_rates: { usd: 0.011 } }, "RUB");
  // Коды валют нормализуются в верхний регистр.
  assert.equal(r?.rates.USD, 0.011);
  assert.equal(r?.base, "RUB");
});

test("parseRates: нулевые и отрицательные курсы отбрасываются", () => {
  const r = parseRates({ base_code: "RUB", rates: { USD: 0.011, BAD: 0, WORSE: -1 } }, "RUB");
  assert.equal(r?.rates.BAD, undefined);
  assert.equal(r?.rates.WORSE, undefined);
  assert.equal(r?.rates.USD, 0.011);
});

test("parseRates: пустой или битый ответ → null", () => {
  assert.equal(parseRates({ rates: {} }, "RUB"), null);
  assert.equal(parseRates({ error: "quota" }, "RUB"), null);
  assert.equal(parseRates(null, "RUB"), null);
});

const RATES: Rates = { base: "RUB", rates: { USD: 0.01, EUR: 0.009 } };

test("convertMinor: рубли → доллары через базовую валюту", () => {
  // 5000 копеек = 50 ₽ → 0.5 $ = 50 центов.
  assert.equal(convertMinor(5000, "RUB", "USD", RATES), 50);
});

test("convertMinor: одинаковая валюта возвращает исходную сумму", () => {
  assert.equal(convertMinor(5000, "RUB", "RUB", RATES), 5000);
});

test("convertMinor: перевод между двумя не-базовыми валютами", () => {
  // 100 центов USD → 90 центов EUR при курсах 0.01 и 0.009 к рублю.
  assert.equal(convertMinor(100, "USD", "EUR", RATES), 90);
});

test("convertMinor: неизвестная валюта → null, а не приблизительное число", () => {
  assert.equal(convertMinor(5000, "RUB", "JPY", RATES), null);
  assert.equal(convertMinor(5000, "GBP", "USD", RATES), null);
  assert.equal(convertMinor(Number.NaN, "RUB", "USD", RATES), null);
});

// --- Котировки токенов ----------------------------------------------------

const DOFFA_MINT = "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo";

test("parseTokenPrice: плоский формат v3", () => {
  const json = { [SOL_MINT]: { usdPrice: 152.31 } };
  assert.equal(parseTokenPrice(json, SOL_MINT), 152.31);
});

test("parseTokenPrice: вложенный формат v2", () => {
  const json = { data: { [SOL_MINT]: { id: SOL_MINT, price: "152.31" } } };
  assert.equal(parseTokenPrice(json, SOL_MINT), 152.31);
});

test("parseTokenPrice: у $DOFFA пула нет — источник молчит, получаем null", () => {
  // Ключевой случай: SOL в ответе есть, DOFFA — нет. Нельзя ни упасть, ни
  // показать ноль: на витрине ноль читался бы как «токен ничего не стоит».
  const json = { [SOL_MINT]: { usdPrice: 152.31 } };
  assert.equal(parseTokenPrice(json, DOFFA_MINT), null);
});

test("parseTokenPrice: ноль и отрицательная цена котировкой не считаются", () => {
  assert.equal(parseTokenPrice({ [DOFFA_MINT]: { usdPrice: 0 } }, DOFFA_MINT), null);
  assert.equal(parseTokenPrice({ [DOFFA_MINT]: { usdPrice: -5 } }, DOFFA_MINT), null);
});

test("parseTokenPrice: битый ответ → null", () => {
  assert.equal(parseTokenPrice(null, SOL_MINT), null);
  assert.equal(parseTokenPrice({ error: "rate limited" }, SOL_MINT), null);
  assert.equal(parseTokenPrice({ [SOL_MINT]: { usdPrice: "дорого" } }, SOL_MINT), null);
});

test("formatUsd: у дешёвых токенов больше знаков после запятой", () => {
  assert.match(formatUsd(152.31), /152,31/);
  assert.match(formatUsd(0.00004212), /0,00004212/);
});
