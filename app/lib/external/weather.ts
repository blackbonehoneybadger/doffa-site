// Погода в кофейне — Open-Meteo (бесплатно, без ключа, без регистрации).
//
// Показывается только если в env заданы реальные координаты кофейни
// (WEATHER_LATITUDE / WEATHER_LONGITUDE). Координат по умолчанию нет намеренно:
// выдуманные показали бы посетителю погоду не того места.

import { INTEGRATIONS } from "../../config/integrations.server";
import { asNumber, fetchJson, prop } from "./http";

export type Weather = {
  /** Температура в °C, округлённая до целого. */
  tempC: number;
  /** Код погоды WMO — из него берётся текстовая подпись и эмодзи. */
  code: number;
  isDay: boolean;
};

// Коды WMO, которые отдаёт Open-Meteo. Диапазоны сгруппированы: для вывески
// кофейни «умеренный снег» и «сильный снег» — одно и то же «снег».
const WMO: { max: number; ru: string; icon: string }[] = [
  { max: 0, ru: "ясно", icon: "☀️" },
  { max: 2, ru: "малооблачно", icon: "🌤️" },
  { max: 3, ru: "пасмурно", icon: "☁️" },
  { max: 48, ru: "туман", icon: "🌫️" },
  { max: 57, ru: "морось", icon: "🌦️" },
  { max: 67, ru: "дождь", icon: "🌧️" },
  { max: 77, ru: "снег", icon: "🌨️" },
  { max: 82, ru: "ливень", icon: "🌧️" },
  { max: 86, ru: "снегопад", icon: "❄️" },
  { max: 99, ru: "гроза", icon: "⛈️" },
];

export function weatherLabelRu(code: number): string {
  return WMO.find((e) => code <= e.max)?.ru ?? "";
}

export function weatherIcon(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  return WMO.find((e) => code <= e.max)?.icon ?? "🌡️";
}

/**
 * Разбирает ответ Open-Meteo. Терпим к двум формам: современной (`current`
 * с `temperature_2m`/`weather_code`) и старой (`current_weather` с
 * `temperature`/`weathercode`) — чтобы смена параметров у поставщика не
 * превращалась в поломку страницы.
 */
export function parseWeather(json: unknown): Weather | null {
  const modern = prop(json, "current");
  const legacy = prop(json, "current_weather");
  const src = modern ?? legacy;
  if (!src) return null;

  const temp = asNumber(prop(src, "temperature_2m") ?? prop(src, "temperature"));
  if (temp === null) return null;

  const code = asNumber(prop(src, "weather_code") ?? prop(src, "weathercode")) ?? 0;
  const dayRaw = prop(src, "is_day");
  const day = asNumber(dayRaw);

  return {
    tempC: Math.round(temp),
    code: Math.trunc(code),
    // is_day приходит как 0/1; если поля нет — считаем, что день.
    isDay: day === null ? true : day !== 0,
  };
}

/** Текущая погода в кофейне. null — интеграция выключена или источник недоступен. */
export async function getWeather(): Promise<Weather | null> {
  const { enabled, latitude, longitude } = INTEGRATIONS.weather;
  if (!enabled || latitude === null || longitude === null) return null;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,is_day&timezone=auto`;

  // 15 минут: погода не меняется быстрее, а внешний сервис не нагружается.
  return parseWeather(await fetchJson(url, { revalidate: 900 }));
}
