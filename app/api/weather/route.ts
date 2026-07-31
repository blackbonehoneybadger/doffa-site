// Погода в кофейне для клиентских компонентов (главная — "use client", поэтому
// сходить во внешний API она сама не может).
//
// Наружу отдаём только готовые к показу поля. Координаты кофейни остаются на
// сервере: они лежат в не-публичных env и в ответе не фигурируют.
import { NextResponse } from "next/server";
import { getWeather, weatherIcon, weatherLabelRu } from "../../lib/external/weather";

export async function GET() {
  const w = await getWeather();

  // Не настроено или источник недоступен — честно говорим, что данных нет.
  // Клиент в этом случае просто не рисует плашку.
  if (!w) return NextResponse.json({ available: false as const });

  return NextResponse.json({
    available: true as const,
    tempC: w.tempC,
    label: weatherLabelRu(w.code),
    icon: weatherIcon(w.code, w.isDay),
  });
}
