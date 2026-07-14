// Чистая крипто-логика пользовательского nonce (без БД и Next cookies).
// Тесты и userAuth.ts используют эти функции с явным секретом.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const NONCE_TTL_MS = 5 * 60 * 1000;

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function buildAuthMessage(wallet: string, nonce: string, exp: number): string {
  return [
    "doffa.coffee просит подтвердить вход.",
    "",
    `Кошелёк: ${wallet}`,
    `Код: ${nonce}`,
    `Действителен до: ${new Date(exp).toISOString()}`,
  ].join("\n");
}

export function issueNonceWithSecret(
  wallet: string,
  secret: string,
  now = Date.now(),
): { message: string; token: string } {
  const nonce = randomBytes(12).toString("hex");
  const exp = now + NONCE_TTL_MS;
  const payload = `${wallet}.${nonce}.${exp}`;
  const token = `${payload}.${signPayload(payload, secret)}`;
  return { message: buildAuthMessage(wallet, nonce, exp), token };
}

export type VerifiedNonce = { wallet: string; message: string; nonce: string; exp: number };

/** В production отсутствие SESSION_SECRET → роуты должны отвечать 503. */
export function userAuthConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.SESSION_SECRET?.trim()) return "SESSION_SECRET не задан";
  return null;
}

export function verifyNonceTokenWithSecret(
  token: string,
  secret: string,
  now = Date.now(),
): VerifiedNonce | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [wallet, nonce, expStr, sig] = parts;
  const payload = `${wallet}.${nonce}.${expStr}`;
  if (!safeEqual(sig, signPayload(payload, secret))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return null;
  return { wallet, message: buildAuthMessage(wallet, nonce, exp), nonce, exp };
}
