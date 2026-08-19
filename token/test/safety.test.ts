import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertMainnetWriteEnabled,
  MAINNET_CONFIRMATION,
  parseTokenAmount,
  validateMemoField,
} from "../src/safety.js";

test("mainnet write: нужны одновременно acknowledgement и точный mint-флаг", () => {
  assert.throws(() =>
    assertMainnetWriteEnabled("mainnet-beta", "burn", "MINT", {
      acknowledgement: MAINNET_CONFIRMATION,
      argv: [],
    }),
  );
  assert.throws(() =>
    assertMainnetWriteEnabled("mainnet-beta", "burn", "MINT", {
      acknowledgement: "wrong",
      argv: ["--confirm-mainnet=MINT"],
    }),
  );
  assert.doesNotThrow(() =>
    assertMainnetWriteEnabled("mainnet-beta", "burn", "MINT", {
      acknowledgement: MAINNET_CONFIRMATION,
      argv: ["--confirm-mainnet=MINT"],
    }),
  );
});

test("devnet write: mainnet-подтверждение не требуется", () => {
  assert.doesNotThrow(() => assertMainnetWriteEnabled("devnet", "create", "TEST"));
});

test("parseTokenAmount: дроби переводятся без Math.round/float", () => {
  assert.equal(parseTokenAmount("1", 6), 1_000_000n);
  assert.equal(parseTokenAmount("1.25", 6), 1_250_000n);
  assert.equal(parseTokenAmount("0.000001", 6), 1n);
  assert.throws(() => parseTokenAmount("0", 6));
  assert.throws(() => parseTokenAmount("1.0000001", 6));
  assert.throws(() => parseTokenAmount("1e6", 6));
});

test("validateMemoField: размер и алфавит ограничены", () => {
  assert.equal(validateMemoField("sale_2026-08-19", "sale", 80), "sale_2026-08-19");
  assert.throws(() => validateMemoField("space is not allowed", "sale", 80));
  assert.throws(() => validateMemoField("x".repeat(81), "sale", 80));
});
