// Вход пользователя по кошельку TON, без пароля.
//
// Код входа: сервер выдаёт подписанный HMAC-токен {nonce, exp} и отдаёт его
// кошельку как payload в ton_proof. Токен остаётся stateless — подделать его
// нельзя без SESSION_SECRET, — а одноразовость обеспечивается при проверке:
// хэш nonce пишется в БД (used_nonces), и повтор того же кода отклоняется.
//
// Кошелёк заранее неизвестен: какой именно адрес подключит человек, решается
// уже в кошельке. Поэтому в код он не зашивается — адрес приходит вместе с
// подписью и проверяется отдельно (app/lib/ton/proof.ts).
//
// Сессия: в cookie кладётся только случайный opaque id, а вся суть сессии
// (кошелёк, время создания, срок годности) хранится в таблице sessions. Это
// даёт истечение по времени и отзыв конкретной сессии — в отличие от прежней
// детерминированной cookie, которую нельзя было ни погасить, ни просрочить.
import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";

const COOKIE_NAME = "doffa_user_session";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней
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

/**
 * Выдаёт код входа. Это же значение уходит кошельку как payload в ton_proof,
 * поэтому оно должно быть коротким и без точек-разделителей внутри частей.
 */
export function issueProofPayload(): { payload: string; exp: number } {
  const nonce = randomBytes(12).toString("hex");
  const exp = Date.now() + NONCE_TTL_MS;
  const тело = `${nonce}.${exp}`;
  return { payload: `${тело}.${sign(тело)}`, exp };
}

export type VerifiedNonce = { nonce: string; exp: number };

/**
 * Проверяет код входа: нашей ли подписью он выдан и не просрочен ли.
 * Одноразовость проверяется отдельно — через consumeNonce().
 */
export function verifyProofPayload(payload: string, nowMs = Date.now()): VerifiedNonce | null {
  const части = (payload ?? "").split(".");
  if (части.length !== 3) return null;
  const [nonce, expStr, sig] = части;
  if (!safeEqual(sig, sign(`${nonce}.${expStr}`))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || nowMs > exp) return null;
  return { nonce, exp };
}

/**
 * Помечает nonce использованным. Возвращает true, если это первое использование,
 * и false, если nonce уже был потрачен (replay). Атомарно за счёт PRIMARY KEY.
 */
export async function consumeNonce(nonce: string, exp: number): Promise<boolean> {
  const nonceHash = createHash("sha256").update(nonce).digest("hex");
  const rows = await query<{ nonce_hash: string }>(
    `insert into used_nonces (nonce_hash, expires_at)
     values ($1, to_timestamp($2 / 1000.0))
     on conflict (nonce_hash) do nothing
     returning nonce_hash`,
    [nonceHash, exp],
  );
  // Опортунистическая уборка просроченных записей — таблица не растёт бесконечно.
  await query(`delete from used_nonces where expires_at < now()`).catch(() => {});
  return rows.length > 0;
}

/** Создаёт серверную сессию и кладёт в cookie только её случайный id. */
export async function createUserSession(wallet: string, userAgent?: string): Promise<void> {
  const id = randomBytes(24).toString("base64url");
  const exp = Date.now() + SESSION_TTL_MS;
  await query(
    `insert into sessions (id, wallet_address, expires_at, user_agent)
     values ($1, $2, to_timestamp($3 / 1000.0), $4)`,
    [id, wallet, exp, userAgent?.slice(0, 300) ?? null],
  );
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Гасит текущую сессию: удаляет её из БД и стирает cookie. */
export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) await query(`delete from sessions where id = $1`, [id]).catch(() => {});
  store.delete(COOKIE_NAME);
}

/** Кошелёк текущей сессии, если cookie валидна и сессия не истекла, иначе null. */
export async function currentWallet(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const rows = await query<{ wallet_address: string }>(
    `select wallet_address from sessions where id = $1 and expires_at > now()`,
    [id],
  );
  return rows[0]?.wallet_address ?? null;
}
