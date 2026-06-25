// Помощники форматирования для сообщений бота.

// Копейки → "150,00 ₽"
export function formatRub(cents: number): string {
  return (cents / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

// Метка времени (мс) → "14:05"
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// Метка времени (мс) → "21.06 14:05"
export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
