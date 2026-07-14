// Чистая (без next/headers и БД) крипто-логика админ-сессий — вынесена
// отдельно, чтобы её можно было юнит-тестировать обычным `node --test` без
// поднятия базы и Next-рантайма.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Сравнение строк, устойчивое к timing-атакам. */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** HMAC-подпись id секретом админ-сессии. */
export function signId(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("hex");
}

/**
 * Разбирает значение cookie вида "id.signature", проверяет подпись отдельным
 * секретом и возвращает id либо null (подделка / мусор). Сам id — случайный
 * opaque токен; подпись — дополнительный слой поверх серверного хранилища.
 */
export function verifyCookie(value: string, secret: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const id = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!id || !sig) return null;
  return constantTimeEqual(sig, signId(id, secret)) ? id : null;
}

/** Пароль совпадает? Пустой ожидаемый пароль всегда даёт false (fail-closed). */
export function passwordMatches(input: string, expected: string | null): boolean {
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

/** Порог блокировки достигнут? */
export function shouldLock(failCount: number, maxFails: number): boolean {
  return failCount >= maxFails;
}
