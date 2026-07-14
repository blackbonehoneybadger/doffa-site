// Ядро админ-auth без next/headers — можно тестировать в node:test.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { query } from "./db";

export const COOKIE_NAME = "doffa_admin_session";
/** 12 часов — в диапазоне 8–24, запрошенном аудитом. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const MAX_FAILED_ATTEMPTS = 5;
/** Окно учёта неудачных попыток и длительность блокировки. */
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function requireAdminSecrets(): void {
  if (!isProduction()) return;
  if (!process.env.ADMIN_SESSION_SECRET?.trim()) {
    throw new Error(
      "ADMIN_SESSION_SECRET не задан. Добавь его в Vercel → Environment Variables (отдельно от SESSION_SECRET).",
    );
  }
  if (!process.env.ADMIN_UPLOAD_PASSWORD?.trim()) {
    throw new Error(
      "ADMIN_UPLOAD_PASSWORD не задан. Добавь его в Vercel → Environment Variables.",
    );
  }
}

function adminSessionSecret(): string {
  requireAdminSecrets();
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (isProduction()) {
    throw new Error("ADMIN_SESSION_SECRET не задан");
  }
  const g = globalThis as { __doffaAdminSessionSecret?: string };
  if (!g.__doffaAdminSessionSecret) {
    g.__doffaAdminSessionSecret = randomBytes(32).toString("hex");
  }
  return g.__doffaAdminSessionSecret;
}

function signSessionId(id: string): string {
  return createHmac("sha256", adminSessionSecret()).update(id).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function encodeSessionCookie(id: string): string {
  return `${id}.${signSessionId(id)}`;
}

export function decodeSessionCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const id = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!id || !sig) return null;
  if (!safeEqual(sig, signSessionId(id))) return null;
  return id;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_UPLOAD_PASSWORD?.trim();
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function newAdminSessionId(): string {
  return randomBytes(24).toString("base64url");
}

export async function cleanupAdminAuthDebris(): Promise<void> {
  await query(`delete from admin_sessions where expires_at < now()`).catch(() => {});
  await query(
    `delete from admin_login_attempts where attempted_at < now() - interval '7 days'`,
  ).catch(() => {});
}

export async function isIpLockedOut(ip: string): Promise<boolean> {
  const rows = await query<{ n: string }>(
    `select count(*)::text as n from admin_login_attempts
     where ip = $1
       and success = false
       and attempted_at > now() - make_interval(secs => $2)`,
    [ip, Math.floor(LOCKOUT_WINDOW_MS / 1000)],
  );
  const n = Number(rows[0]?.n ?? 0);
  return n >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  await query(
    `insert into admin_login_attempts (ip, success) values ($1, $2)`,
    [ip, success],
  );
  await cleanupAdminAuthDebris();
}

export async function insertAdminSession(opts: {
  id: string;
  expiresAtMs: number;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await query(
    `insert into admin_sessions (id, expires_at, ip, user_agent)
     values ($1, to_timestamp($2 / 1000.0), $3, $4)`,
    [
      opts.id,
      opts.expiresAtMs,
      opts.ip?.slice(0, 64) ?? null,
      opts.userAgent?.slice(0, 300) ?? null,
    ],
  );
}

export async function adminSessionExists(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `select id from admin_sessions where id = $1 and expires_at > now()`,
    [id],
  );
  return rows.length > 0;
}

export async function revokeAdminSession(id: string): Promise<void> {
  await query(`delete from admin_sessions where id = $1`, [id]);
}
