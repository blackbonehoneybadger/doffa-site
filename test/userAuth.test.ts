// Юнит-тесты пользовательского auth: fail-closed SESSION_SECRET + nonce crypto.
// Replay одноразовости живёт в БД (consumeNonce) — здесь проверяем, что
// подпись токена валидна, а подделка/просрок отклоняются.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  issueNonceWithSecret,
  verifyNonceTokenWithSecret,
  userAuthConfigError,
  NONCE_TTL_MS,
} from "../app/lib/userAuthCore";
import { nonceRequestSchema, verifyRequestSchema } from "../app/lib/validation";
import { clientIp } from "../app/lib/authRateLimit";

const SECRET = "test-session-secret-at-least-32-chars!!";
const WALLET = "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKCmgrYNfw5V";

test("issue+verify: round-trip с одним секретом", () => {
  const { token, message } = issueNonceWithSecret(WALLET, SECRET);
  const verified = verifyNonceTokenWithSecret(token, SECRET);
  assert.ok(verified);
  assert.equal(verified!.wallet, WALLET);
  assert.equal(verified!.message, message);
  assert.ok(verified!.exp > Date.now());
});

test("verify: подделанная подпись отклоняется (replay без секрета невозможен)", () => {
  const { token } = issueNonceWithSecret(WALLET, SECRET);
  const tampered = token.slice(0, -4) + "dead";
  assert.equal(verifyNonceTokenWithSecret(tampered, SECRET), null);
  assert.equal(verifyNonceTokenWithSecret(token, "other-secret-xxxxxxxxxxxxxxxxxxxx"), null);
});

test("verify: просроченный nonce отклоняется", () => {
  const past = Date.now() - NONCE_TTL_MS - 1000;
  const { token } = issueNonceWithSecret(WALLET, SECRET, past);
  assert.equal(verifyNonceTokenWithSecret(token, SECRET), null);
});

test("userAuthConfigError: production без SESSION_SECRET — fail-closed", () => {
  const env = process.env as Record<string, string | undefined>;
  const prevNode = env.NODE_ENV;
  const prevSecret = env.SESSION_SECRET;
  try {
    env.NODE_ENV = "production";
    delete env.SESSION_SECRET;
    assert.equal(userAuthConfigError(), "SESSION_SECRET не задан");
    env.SESSION_SECRET = SECRET;
    assert.equal(userAuthConfigError(), null);
  } finally {
    if (prevNode === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prevNode;
    if (prevSecret === undefined) delete env.SESSION_SECRET;
    else env.SESSION_SECRET = prevSecret;
  }
});

test("nonceRequestSchema / verifyRequestSchema", () => {
  assert.equal(nonceRequestSchema.safeParse({ wallet: WALLET }).success, true);
  assert.equal(nonceRequestSchema.safeParse({ wallet: "bad" }).success, false);
  assert.equal(
    verifyRequestSchema.safeParse({ token: "a", signature: "b" }).success,
    true,
  );
  assert.equal(verifyRequestSchema.safeParse({ token: "", signature: "b" }).success, false);
});

test("clientIp: x-forwarded-for берёт первый адрес", () => {
  const req = new Request("http://localhost/api/auth/nonce", {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  });
  assert.equal(clientIp(req), "203.0.113.10");
});
