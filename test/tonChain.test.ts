import { test } from "node:test";
import assert from "node:assert/strict";
import {
  burnedFromSupply,
  dailyPool,
  equilibrium,
  parseJetton,
  parseJettonBalance,
  toUiAmount,
} from "../app/lib/ton/chain";

// Миллиард DOFF по девять знаков после запятой — это 10^18 базовых единиц.
// Ровно то число, на котором ломается наивный перевод через Number.
const МИЛЛИАРД = "1000000000000000000";

test("миллиард с девятью знаками переводится точно", () => {
  assert.equal(toUiAmount(МИЛЛИАРД, 9), 1_000_000_000);
});

test("дробная часть не теряется и не тянет нули", () => {
  assert.equal(toUiAmount("1500000000", 9), 1.5);
  assert.equal(toUiAmount("1", 9), 0.000000001);
  assert.equal(toUiAmount("0", 9), 0);
});

test("сумма меньше одного токена не округляется до нуля", () => {
  assert.equal(toUiAmount("123456789", 9), 0.123456789);
});

test("ноль знаков после запятой тоже работает", () => {
  assert.equal(toUiAmount("42", 0), 42);
});

test("мусор вместо суммы — это null, а не ноль", () => {
  assert.equal(toUiAmount("-5", 9), null);
  assert.equal(toUiAmount("1.5", 9), null);
  assert.equal(toUiAmount("", 9), null);
  assert.equal(toUiAmount("10", -1), null);
  assert.equal(toUiAmount("10", 1.5), null);
});

test("разбор мастер-контракта достаёт эмиссию, тикер и админа", () => {
  const info = parseJetton({
    total_supply: МИЛЛИАРД,
    mintable: false,
    admin: { address: "0:abc" },
    metadata: { symbol: "DOFF", decimals: "9" },
  });
  assert.deepEqual(info, {
    totalSupply: 1_000_000_000,
    decimals: 9,
    symbol: "DOFF",
    mintable: false,
    admin: "0:abc",
  });
});

test("снятый админ приходит как null, а не как пустая строка", () => {
  const info = parseJetton({
    total_supply: МИЛЛИАРД,
    mintable: false,
    admin: { address: "" },
    metadata: { decimals: 9 },
  });
  assert.equal(info?.admin, null);
});

test("админа нет в ответе вовсе — тоже null", () => {
  const info = parseJetton({ total_supply: "1", mintable: false, metadata: { decimals: 0 } });
  assert.equal(info?.admin, null);
});

test("отсутствие поля mintable считается «допечатка возможна»", () => {
  // Осторожная сторона ошибки: обещать «больше не выпустят» без подтверждения
  // из сети нельзя.
  const info = parseJetton({ total_supply: "1", metadata: { decimals: 0 } });
  assert.equal(info?.mintable, true);
});

test("чужая форма ответа — это null, а не выдуманные нули", () => {
  assert.equal(parseJetton(null), null);
  assert.equal(parseJetton({}), null);
  assert.equal(parseJetton({ total_supply: МИЛЛИАРД }), null);
  assert.equal(parseJetton({ metadata: { decimals: 9 } }), null);
});

test("баланс фонда: настоящий ноль отличается от «узел не ответил»", () => {
  assert.equal(parseJettonBalance({ balance: "0" }, 9), 0);
  assert.equal(parseJettonBalance({}, 9), null);
  assert.equal(parseJettonBalance(null, 9), null);
});

test("сожжено — это разница между выпущенным и тем, что в сети", () => {
  const было = { totalSupply: 999_000_000, decimals: 9, symbol: "DOFF", mintable: false, admin: null };
  assert.equal(burnedFromSupply(1_000_000_000, было), 1_000_000);
});

test("если сеть показывает больше выпущенного — не показываем ничего", () => {
  const странно = { totalSupply: 2_000_000_000, decimals: 9, symbol: "DOFF", mintable: false, admin: null };
  assert.equal(burnedFromSupply(1_000_000_000, странно), null);
  assert.equal(burnedFromSupply(1_000_000_000, null), null);
});

test("дневной пул — тысячная остатка фонда", () => {
  assert.equal(dailyPool(1_000_000, 1000), 1000);
  assert.equal(dailyPool(0, 1000), 0);
});

test("пул всегда меньше остатка — фонд не обнуляется", () => {
  let фонд = 1_000_000;
  for (let д = 0; д < 2000; д++) {
    const пул = dailyPool(фонд, 1000)!;
    assert.ok(пул < фонд, `пул обязан быть меньше фонда на сутках ${д}`);
    фонд -= пул;
  }
  assert.ok(фонд > 0, "фонд обязан остаться положительным");
});

test("равновесие и пул — обратные друг другу", () => {
  const точка = equilibrium(1000, 1000)!;
  assert.equal(точка, 1_000_000);
  assert.equal(dailyPool(точка, 1000), 1000);
});

test("бессмысленные входные данные не дают выдуманных чисел", () => {
  assert.equal(dailyPool(-1, 1000), null);
  assert.equal(dailyPool(100, 0), null);
  assert.equal(equilibrium(-1, 1000), null);
  assert.equal(equilibrium(100, 0), null);
});
