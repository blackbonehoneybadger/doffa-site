// Форматирование цен маркетплейса. Locale-aware, из минорных единиц (копеек/центов).
const SYMBOL: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

export function formatPrice(cents: number, currency = "RUB", locale = "ru-RU"): string {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    // Неизвестная валюта — показываем число + символ/код, без падения.
    const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    return `${n} ${SYMBOL[currency] ?? currency}`;
  }
}

/** Читаемая сумма DOFFA (bigint в минимальных единицах → строка с decimals=6). */
export function formatDoffa(amountBase: bigint | number, decimals = 6): string {
  const base = typeof amountBase === "bigint" ? amountBase : BigInt(Math.round(amountBase));
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = base / divisor;
  const frac = base % divisor;
  if (frac === BigInt(0)) return `${whole.toLocaleString("ru-RU")} DOFFA`;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 2);
  return `${whole.toLocaleString("ru-RU")}${fracStr ? "," + fracStr : ""} DOFFA`;
}
