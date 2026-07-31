// Разбор ответов Solana RPC. Сеть не используется — фикстуры в том виде, в
// каком их отдаёт узел. Проверяется главное: при недоступном или непонятном
// ответе получается null, а не правдоподобная цифра на странице.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseSupply,
  parseMintAuthorities,
  parseOwnerBalance,
  burnedFromSupply,
  toUiAmount,
} from "../app/lib/solana/chain";

// --- Эмиссия --------------------------------------------------------------

test("parseSupply: обычный ответ getTokenSupply", () => {
  const r = parseSupply({
    context: { slot: 1 },
    value: { amount: "100000000000000", decimals: 6, uiAmount: 100000000, uiAmountString: "100000000" },
  });
  assert.deepEqual(r, { total: 100_000_000, decimals: 6 });
});

test("parseSupply: uiAmount = null — считаем из amount и decimals", () => {
  // Узел может не отдать uiAmount для больших значений; терять эмиссию нельзя.
  const r = parseSupply({ value: { amount: "99500000000000", decimals: 6, uiAmount: null } });
  assert.deepEqual(r, { total: 99_500_000, decimals: 6 });
});

test("parseSupply: мусор и ошибка RPC → null", () => {
  assert.equal(parseSupply(null), null);
  assert.equal(parseSupply({}), null);
  assert.equal(parseSupply({ value: { amount: "нет", decimals: 6, uiAmount: null } }), null);
  assert.equal(parseSupply({ value: { amount: "1000", uiAmount: null } }), null);
});

test("toUiAmount: перевод по decimals, нечисловая строка → null", () => {
  assert.equal(toUiAmount("100000000000000", 6), 100_000_000);
  assert.equal(toUiAmount("1500000", 6), 1.5);
  assert.equal(toUiAmount("-5", 6), null);
  assert.equal(toUiAmount("abc", 6), null);
});

// --- Права на токен -------------------------------------------------------

test("parseMintAuthorities: права отозваны — оба поля null", () => {
  const r = parseMintAuthorities({
    value: {
      data: {
        parsed: {
          info: { decimals: 6, freezeAuthority: null, mintAuthority: null, supply: "100000000000000" },
          type: "mint",
        },
        program: "spl-token",
      },
    },
  });
  assert.deepEqual(r, { mintAuthority: null, freezeAuthority: null });
});

test("parseMintAuthorities: права ещё у кого-то — адреса возвращаются", () => {
  const owner = "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS";
  const r = parseMintAuthorities({
    value: { data: { parsed: { info: { mintAuthority: owner, freezeAuthority: owner } } } },
  });
  assert.equal(r?.mintAuthority, owner);
  assert.equal(r?.freezeAuthority, owner);
});

test("parseMintAuthorities: RPC недоступен → null, а не «отозваны»", () => {
  // Критично: недоступность сети не должна читаться как «права отозваны»,
  // иначе сайт подтвердил бы факт, которого не проверял.
  assert.equal(parseMintAuthorities(null), null);
  assert.equal(parseMintAuthorities({ value: null }), null);
  assert.equal(parseMintAuthorities({}), null);
});

// --- Баланс фонда ---------------------------------------------------------

function tokenAccount(uiAmount: number | null) {
  return { account: { data: { parsed: { info: { tokenAmount: { uiAmount } } } } } };
}

test("parseOwnerBalance: суммирует все токен-аккаунты владельца", () => {
  const r = parseOwnerBalance({ value: [tokenAccount(750_000), tokenAccount(250_000)] });
  assert.equal(r, 1_000_000);
});

test("parseOwnerBalance: аккаунтов нет — честный ноль", () => {
  assert.equal(parseOwnerBalance({ value: [] }), 0);
});

test("parseOwnerBalance: битый ответ → null, а не ноль", () => {
  // Ноль означал бы «фонд пуст», null — «не смогли прочитать». Это разные вещи.
  assert.equal(parseOwnerBalance(null), null);
  assert.equal(parseOwnerBalance({}), null);
  assert.equal(parseOwnerBalance({ value: "oops" }), null);
});

// --- Объём сжигания -------------------------------------------------------

test("burnedFromSupply: сожжённое — разница эмиссий", () => {
  assert.equal(burnedFromSupply(100_000_000, { total: 99_500_000, decimals: 6 }), 500_000);
});

test("burnedFromSupply: эмиссия не менялась — ноль сожжённых", () => {
  assert.equal(burnedFromSupply(100_000_000, { total: 100_000_000, decimals: 6 }), 0);
});

test("burnedFromSupply: эмиссия неизвестна → null", () => {
  assert.equal(burnedFromSupply(100_000_000, null), null);
});

test("burnedFromSupply: эмиссия в сети больше заявленной → null, а не минус", () => {
  // Значит, заявленная первоначальная эмиссия не сходится с сетью. Показывать
  // отрицательное «сожжено» нельзя — честнее не показывать ничего.
  assert.equal(burnedFromSupply(100_000_000, { total: 120_000_000, decimals: 6 }), null);
});
