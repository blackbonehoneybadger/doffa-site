"use client";

// Плашка «сейчас в ауле» рядом с адресом и часами работы.
//
// Пока данных нет — не рисуется вообще: ни скелетона, ни прочерка. Погода это
// украшение, а не обязательный элемент, и подставлять сюда что-либо при
// недоступном источнике нельзя.

import { useEffect, useState } from "react";

type WeatherResponse = { available: true; tempC: number; label: string; icon: string } | { available: false };

export function WeatherChip() {
  const [data, setData] = useState<Extract<WeatherResponse, { available: true }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((r) => (r.ok ? (r.json() as Promise<WeatherResponse>) : null))
      .then((json) => {
        if (!cancelled && json && json.available) setData(json);
      })
      .catch(() => {
        // Молча: отсутствие погоды не повод шуметь в консоли у посетителя.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  // Знак «плюс» у положительной температуры — так привычнее читается.
  const temp = `${data.tempC > 0 ? "+" : ""}${data.tempC}°`;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
      {data.icon} {temp}
      {data.label ? <span className="text-cream/55">· {data.label}</span> : null}
    </span>
  );
}
