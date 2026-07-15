// Оплата в DOFFA — чистая логика (без сети), которую покрываем тестами.
// Серверная проверка транзакции (RPC) строится поверх этих функций.
//
// Принципы:
// - DOFFA — ДОПОЛНИТЕЛЬНЫЙ способ оплаты, не единственный.
// - Курс не фиксируем навсегда: цена в DOFFA считается по котировке с TTL.
// - Клиент НЕ подтверждает оплату сам — это делает сервер, проверяя mint,
//   получателя, сумму, decimals, подпись, финальность и отсутствие повторного
//   использования транзакции.

export type DoffaQuote = {
  orderRef: string;
  priceCents: number;
  /** Сумма в минимальных единицах DOFFA (с учётом decimals). */
  amountBase: bigint;
  /** Человекочитаемая сумма DOFFA. */
  amountUi: number;
  rateUsd: number;
  rateSource: string;
  toleranceBps: number;
  createdAtMs: number;
  expiresAtMs: number;
};

/**
 * Считает котировку цены в DOFFA. Курс приходит из проверенного источника
 * (price provider) — фиксированный курс не «зашивается».
 * @param priceCents цена товара в минорных единицах фиатной валюты
 * @param fiatPerFiatUsd курс фиатной валюты к USD (сколько USD за 1 единицу валюты)
 * @param doffaUsd цена 1 DOFFA в USD (из подтверждённого источника)
 */
export function computeDoffaQuote(params: {
  orderRef: string;
  priceCents: number;
  fiatUsdRate: number; // USD за 1 единицу фиатной валюты
  doffaUsd: number; // USD за 1 DOFFA
  decimals: number;
  ttlMinutes: number;
  nowMs: number;
  rateSource: string;
  toleranceBps?: number;
}): DoffaQuote {
  const { orderRef, priceCents, fiatUsdRate, doffaUsd, decimals, ttlMinutes, nowMs, rateSource } = params;
  if (!(priceCents >= 0)) throw new Error("priceCents must be >= 0");
  if (!(doffaUsd > 0)) throw new Error("doffaUsd must be > 0");
  if (!(fiatUsdRate > 0)) throw new Error("fiatUsdRate must be > 0");

  const priceUsd = (priceCents / 100) * fiatUsdRate;
  const amountUi = priceUsd / doffaUsd;
  const amountBase = BigInt(Math.ceil(amountUi * 10 ** decimals));

  return {
    orderRef,
    priceCents,
    amountBase,
    amountUi,
    rateUsd: doffaUsd,
    rateSource,
    toleranceBps: params.toleranceBps ?? 100,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + ttlMinutes * 60_000,
  };
}

/** Котировка истекла? После истечения цену нужно пересчитать. */
export function isQuoteExpired(quote: Pick<DoffaQuote, "expiresAtMs">, nowMs: number): boolean {
  return nowMs >= quote.expiresAtMs;
}

export type VerifyInput = {
  /** Параметры, извлечённые сервером из транзакции по RPC. */
  observedMint: string;
  observedReceiver: string;
  observedAmountBase: bigint;
  observedDecimals: number;
  finalized: boolean;
  /** Ожидаемые значения для конкретного заказа. */
  expectedMint: string;
  expectedReceiver: string;
  quote: DoffaQuote;
  nowMs: number;
  /** Транзакция уже использована для другого заказа? */
  signatureAlreadyUsed: boolean;
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason:
      | "wrong_mint" | "wrong_receiver" | "wrong_decimals" | "not_finalized"
      | "quote_expired" | "underpaid" | "signature_reused" };

/**
 * Проверяет соответствие транзакции заказу. Переплата допускается (>=),
 * недоплата — нет. Отклонение в пределах tolerance учитывается на нижней границе.
 */
export function verifyDoffaPayment(input: VerifyInput): VerifyResult {
  if (input.signatureAlreadyUsed) return { ok: false, reason: "signature_reused" };
  if (input.observedMint !== input.expectedMint) return { ok: false, reason: "wrong_mint" };
  if (input.observedReceiver !== input.expectedReceiver) return { ok: false, reason: "wrong_receiver" };
  if (input.observedDecimals !== 6 && input.observedDecimals !== decimalsOf(input.quote))
    return { ok: false, reason: "wrong_decimals" };
  if (!input.finalized) return { ok: false, reason: "not_finalized" };
  if (isQuoteExpired(input.quote, input.nowMs)) return { ok: false, reason: "quote_expired" };

  // Нижняя допустимая граница с учётом tolerance (например, 1% проскальзывание).
  const tol = BigInt(input.quote.toleranceBps);
  const minRequired = input.quote.amountBase - (input.quote.amountBase * tol) / BigInt(10_000);
  if (input.observedAmountBase < minRequired) return { ok: false, reason: "underpaid" };

  return { ok: true };
}

function decimalsOf(quote: DoffaQuote): number {
  // amountBase = ceil(amountUi * 10^decimals) → decimals восстанавливаем из данных котировки,
  // но decimals у DOFFA фиксирован (6); функция оставлена для явности проверки.
  void quote;
  return 6;
}

/**
 * Разбивает сумму заказа: комиссия площадки и сумма продавцу. Деньги площадки и
 * продавца учитываются прозрачно и раздельно.
 */
export function splitOrderAmounts(params: {
  subtotalCents: number;
  shippingCents: number;
  feePercent: number | null; // null → комиссия не настроена
}): { feeCents: number; sellerAmountCents: number; totalCents: number } {
  const { subtotalCents, shippingCents } = params;
  const total = subtotalCents + shippingCents;
  const feePct = params.feePercent == null ? 0 : Math.max(0, Math.min(100, params.feePercent));
  const feeCents = Math.round((subtotalCents * feePct) / 100);
  const sellerAmountCents = subtotalCents - feeCents + shippingCents;
  return { feeCents, sellerAmountCents, totalCents: total };
}
