// Сессия админ-панели (/admin) — управляет публичными видео и Blob-хранилищем,
// поэтому вход защищён серьёзнее «одной общей cookie».
//
// - в cookie только случайный opaque session id, подписанный ОТДЕЛЬНЫМ
//   ADMIN_SESSION_SECRET (не общим SESSION_SECRET пользовательских сессий);
// - суть сессии (срок, ip, ua) — в таблице admin_sessions, поэтому её можно
//   просрочить и индивидуально отозвать (logout удаляет строку);
// - срок жизни 12 часов вместо прежних 30 дней;
// - rate limit и временная блокировка по IP после серии неверных паролей;
// - в production и пароль, и секрет обязаны быть заданы (иначе fail-closed).
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import { signId, verifyCookie, passwordMatches } from "./adminAuthCore";

const COOKIE_NAME = "doffa_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 часов
export const MAX_FAILS = 7; // блокировка после стольких неудачных попыток
const LOCKOUT_MINUTES = 15;
const FAIL_WINDOW_MINUTES = 15;

// Секрет админ-сессии — отдельный от пользовательского SESSION_SECRET. В dev,
// если не задан, генерируем эфемерный (сессии не переживут рестарт — это ок).
// В production отсутствие секрета ловит adminConfigError() (fail-closed).
const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  (process.env.NODE_ENV !== "production" ? randomBytes(32).toString("hex") : "");

/** В production и пароль, и секрет админ-сессии обязаны быть заданы. */
export function adminConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.ADMIN_SESSION_SECRET?.trim()) return "ADMIN_SESSION_SECRET не задан";
  if (!process.env.ADMIN_UPLOAD_PASSWORD?.trim()) return "ADMIN_UPLOAD_PASSWORD не задан";
  return null;
}

/** Пароль верный? Сравнение защищено от timing-атак. */
export function checkPassword(input: string): boolean {
  return passwordMatches(input, process.env.ADMIN_UPLOAD_PASSWORD?.trim() ?? null);
}

/** IP сейчас заблокирован из-за перебора пароля? */
export async function isLockedOut(ip: string): Promise<boolean> {
  const rows = await query<{ locked_until: string | null }>(
    `select locked_until from admin_login_limits where ip = $1`,
    [ip],
  );
  const lockedUntil = rows[0]?.locked_until;
  return lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;
}

/** Фиксирует неудачную попытку входа и ставит блокировку при достижении порога. */
export async function recordFailure(ip: string): Promise<void> {
  // Счётчик сбрасывается, если прошлая серия ошибок старше окна.
  await query(
    `insert into admin_login_limits (ip, fail_count, first_failed_at, updated_at)
     values ($1, 1, now(), now())
     on conflict (ip) do update set
       fail_count = case
         when admin_login_limits.first_failed_at < now() - interval '${FAIL_WINDOW_MINUTES} minutes'
         then 1 else admin_login_limits.fail_count + 1 end,
       first_failed_at = case
         when admin_login_limits.first_failed_at < now() - interval '${FAIL_WINDOW_MINUTES} minutes'
         then now() else admin_login_limits.first_failed_at end,
       updated_at = now()`,
    [ip],
  );
  await query(
    `update admin_login_limits
     set locked_until = now() + interval '${LOCKOUT_MINUTES} minutes', updated_at = now()
     where ip = $1 and fail_count >= $2`,
    [ip, MAX_FAILS],
  );
}

/** Сбрасывает счётчик попыток (после успешного входа). */
export async function clearFailures(ip: string): Promise<void> {
  await query(`delete from admin_login_limits where ip = $1`, [ip]).catch(() => {});
}

export async function createSession(ip?: string, userAgent?: string): Promise<void> {
  const id = randomBytes(24).toString("base64url");
  const exp = Date.now() + SESSION_TTL_MS;
  await query(
    `insert into admin_sessions (id, expires_at, ip, user_agent)
     values ($1, to_timestamp($2 / 1000.0), $3, $4)`,
    [id, exp, ip ?? null, userAgent?.slice(0, 300) ?? null],
  );
  // Опортунистическая уборка просроченных сессий и старых записей о попытках.
  await query(`delete from admin_sessions where expires_at < now()`).catch(() => {});
  await query(
    `delete from admin_login_limits where updated_at < now() - interval '30 days'`,
  ).catch(() => {});
  const store = await cookies();
  store.set(COOKIE_NAME, `${id}.${signId(id, ADMIN_SECRET)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value) {
    const id = verifyCookie(value, ADMIN_SECRET);
    if (id) await query(`delete from admin_sessions where id = $1`, [id]).catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

/** Проверяет cookie текущего запроса (для API-роутов и серверных компонентов). */
export async function isAuthed(): Promise<boolean> {
  if (adminConfigError()) return false;
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const id = verifyCookie(value, ADMIN_SECRET);
  if (!id) return false;
  const rows = await query<{ id: string }>(
    `select id from admin_sessions where id = $1 and expires_at > now()`,
    [id],
  );
  return rows.length > 0;
}
