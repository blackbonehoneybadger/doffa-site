// Юнит-тесты чистой логики оплаты маркетплейса (без сети и БД).
// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDoffaQuote,
  isQuoteExpired,
  verifyDoffaPayment,
  splitOrderAmounts,
  type DoffaQuote,
} from "../app/lib/payments/doffa";
import { getPaymentProvider } from "../app/lib/payments/provider";

// Фиктивный mint — тест про арифметику котировки, а не про конкретный токен.
const MINT = "TestMint1111111111111111111111111111111111";
const RECV = "DoFFAReceiverAddress1111111111111111111111";
const NOW = 1_700_000_000_000;

function quote(over: Partial<Parameters<typeof computeDoffaQuote>[0]> = {}): DoffaQuote {
  return computeDoffaQuote({
    orderRef: "ORD-1",
    priceCents: 10_000, // 100.00 валюты
    fiatUsdRate: 1, // 1 единица = 1 USD (упрощённо)
    doffaUsd: 0.5, // 1 DOFFA = $0.5 → 100 USD = 200 DOFFA
    decimals: 6,
    ttlMinutes: 10,
    nowMs: NOW,
    rateSource: "test",
    ...over,
  });
}

test("computeDoffaQuote: 100 USD при курсе $0.5 = 200 DOFFA", () => {
  const q = quote();
  assert.equal(q.amountUi, 200);
  assert.equal(q.amountBase, BigInt(200_000_000)); // 200 * 10^6
  assert.equal(q.expiresAtMs, NOW + 10 * 60_000);
});

test("computeDoffaQuote: невалидные входные данные бросают ошибку", () => {
  assert.throws(() => quote({ doffaUsd: 0 }));
  assert.throws(() => quote({ fiatUsdRate: 0 }));
});

test("isQuoteExpired: истекает по TTL", () => {
  const q = quote();
  assert.equal(isQuoteExpired(q, NOW + 9 * 60_000), false);
  assert.equal(isQuoteExpired(q, NOW + 10 * 60_000), true);
  assert.equal(isQuoteExpired(q, NOW + 11 * 60_000), true);
});

const baseVerify = (over = {}) => ({
  observedMint: MINT,
  observedReceiver: RECV,
  observedAmountBase: BigInt(200_000_000),
  observedDecimals: 6,
  finalized: true,
  expectedMint: MINT,
  expectedReceiver: RECV,
  quote: quote(),
  nowMs: NOW + 60_000,
  signatureAlreadyUsed: false,
  ...over,
});

test("verifyDoffaPayment: корректная оплата принимается", () => {
  assert.deepEqual(verifyDoffaPayment(baseVerify()), { ok: true });
});

test("verifyDoffaPayment: переплата допускается", () => {
  assert.deepEqual(verifyDoffaPayment(baseVerify({ observedAmountBase: BigInt(210_000_000) })), { ok: true });
});

test("verifyDoffaPayment: недоплата отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ observedAmountBase: BigInt(150_000_000) }));
  assert.deepEqual(r, { ok: false, reason: "underpaid" });
});

test("verifyDoffaPayment: неправильный mint отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ observedMint: "WRONGmint1111111111111111111111111111111111" }));
  assert.deepEqual(r, { ok: false, reason: "wrong_mint" });
});

test("verifyDoffaPayment: чужой получатель отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ observedReceiver: "SomeoneElse1111111111111111111111111111111" }));
  assert.deepEqual(r, { ok: false, reason: "wrong_receiver" });
});

test("verifyDoffaPayment: неподтверждённая транзакция отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ finalized: false }));
  assert.deepEqual(r, { ok: false, reason: "not_finalized" });
});

test("verifyDoffaPayment: просроченная котировка отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ nowMs: NOW + 11 * 60_000 }));
  assert.deepEqual(r, { ok: false, reason: "quote_expired" });
});

test("verifyDoffaPayment: повторное использование транзакции отклоняется", () => {
  const r = verifyDoffaPayment(baseVerify({ signatureAlreadyUsed: true }));
  assert.deepEqual(r, { ok: false, reason: "signature_reused" });
});

test("verifyDoffaPayment: допуск tolerance на нижней границе (1%)", () => {
  // amountBase 200_000_000, tolerance 100bps → min 198_000_000
  assert.deepEqual(verifyDoffaPayment(baseVerify({ observedAmountBase: BigInt(198_000_000) })), { ok: true });
  assert.deepEqual(
    verifyDoffaPayment(baseVerify({ observedAmountBase: BigInt(197_999_999) })),
    { ok: false, reason: "underpaid" },
  );
});

test("splitOrderAmounts: комиссия и сумма продавцу считаются раздельно", () => {
  const r = splitOrderAmounts({ subtotalCents: 10_000, shippingCents: 500, feePercent: 10 });
  assert.equal(r.feeCents, 1_000); // 10% от 10000
  assert.equal(r.sellerAmountCents, 9_500); // 10000 - 1000 + 500 (доставка продавцу)
  assert.equal(r.totalCents, 10_500);
});

test("splitOrderAmounts: комиссия не настроена (null) → 0", () => {
  const r = splitOrderAmounts({ subtotalCents: 10_000, shippingCents: 0, feePercent: null });
  assert.equal(r.feeCents, 0);
  assert.equal(r.sellerAmountCents, 10_000);
});

test("getPaymentProvider: в production без секрета — null (никакого mock)", () => {
  assert.equal(getPaymentProvider(null, true), null);
});

test("getPaymentProvider: в dev без секрета — mock, но он не подтверждает оплату", async () => {
  const p = getPaymentProvider(null, false);
  assert.ok(p);
  const v = await p!.verifyPayment("mock_ORD-1");
  assert.equal(v.ok, false); // mock не выдаёт успешную оплату
});
