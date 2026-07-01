// Простая сессия для админ-панели загрузки видео: один общий пароль на кофейню,
// без базы пользователей. Сессия — HMAC-подписанная cookie, не JWT-библиотека,
// потому что здесь ровно один секрет и ровно одна роль ("владелец загрузил видео").
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "doffa_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дней

// Секрет сессии. Если не задан — генерируем на старте процесса: сессии не
// переживут рестарт сервера, но это безопаснее захардкоженного дефолта.
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

/** Пароль верный? Сравнение защищено от timing-атак. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_UPLOAD_PASSWORD?.trim();
  if (!expected) return false;
  return safeEqual(input, expected);
}

const SESSION_PAYLOAD = "doffa-admin-v1";

/** Значение cookie для валидной сессии — детерминированное, без штампа времени. */
function sessionToken(): string {
  return `${SESSION_PAYLOAD}.${sign(SESSION_PAYLOAD)}`;
}

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Проверяет cookie текущего запроса (для API-роутов и серверных компонентов). */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return safeEqual(value, sessionToken());
}
