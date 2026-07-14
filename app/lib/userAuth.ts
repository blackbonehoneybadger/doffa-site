// Сессия пользователя сайта: вход по Solana-кошельку, без пароля. Тот же
// паттерн, что и в adminAuth.ts (HMAC-подписанная cookie, без JWT-библиотеки),
// плюс одноразовый nonce для подписи — тоже без БД, всё зашито в подписанный
// токен: {wallet, nonce, exp} + HMAC.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "doffa_user_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 дней
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 минут на подпись

const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomUUID() + crypto.randomUUID();

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function buildMessage(wallet: string, nonce: string, exp: number): string {
  return [
    "doffa.coffee просит подтвердить вход.",
    "",
    `Кошелёк: ${wallet}`,
    `Код: ${nonce}`,
    `Действителен до: ${new Date(exp).toISOString()}`,
  ].join("\n");
}

/** Выдаёт сообщение для подписи и токен с зашитым nonce (без записи в БД). */
export function issueNonce(wallet: string): { message: string; token: string } {
  const nonce = randomBytes(12).toString("hex");
  const exp = Date.now() + NONCE_TTL_MS;
  const payload = `${wallet}.${nonce}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  return { message: buildMessage(wallet, nonce, exp), token };
}

/**
 * Проверяет токен nonce (подпись и срок годности) и возвращает кошелёк и
 * ожидаемый текст сообщения — само сообщение переcобирается на сервере, а не
 * берётся из запроса клиента, чтобы клиент не мог подсунуть на подпись
 * произвольный текст.
 */
export function verifyNonceToken(token: string): { wallet: string; message: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [wallet, nonce, expStr, sig] = parts;
  const payload = `${wallet}.${nonce}.${expStr}`;
  if (!safeEqual(sig, sign(payload))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { wallet, message: buildMessage(wallet, nonce, exp) };
}

function sessionToken(wallet: string): string {
  return `${wallet}.${sign(wallet)}`;
}

export async function createUserSession(wallet: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(wallet), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Кошелёк текущей сессии, если cookie валидна, иначе null. */
export async function currentWallet(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx < 0) return null;
  const wallet = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!safeEqual(sig, sign(wallet))) return null;
  return wallet;
}
