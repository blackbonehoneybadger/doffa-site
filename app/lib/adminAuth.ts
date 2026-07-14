// Обёртка Next.js поверх adminAuthCore: cookie + opaque admin session.
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  COOKIE_NAME,
  decodeSessionCookie,
  encodeSessionCookie,
  insertAdminSession,
  newAdminSessionId,
  adminSessionExists,
  revokeAdminSession,
  requireAdminSecrets,
  cleanupAdminAuthDebris,
} from "./adminAuthCore";

export {
  COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MS,
  requireAdminSecrets,
  checkPassword,
  clientIpFromRequest,
  encodeSessionCookie,
  decodeSessionCookie,
  isIpLockedOut,
  recordLoginAttempt,
  insertAdminSession,
  adminSessionExists,
  revokeAdminSession,
  cleanupAdminAuthDebris,
  newAdminSessionId,
} from "./adminAuthCore";

export async function createSession(opts?: {
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  requireAdminSecrets();
  const id = newAdminSessionId();
  const expiresAtMs = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  await insertAdminSession({
    id,
    expiresAtMs,
    ip: opts?.ip,
    userAgent: opts?.userAgent,
  });
  await cleanupAdminAuthDebris();
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSessionCookie(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const id = decodeSessionCookie(raw);
  if (id) await revokeAdminSession(id).catch(() => {});
  store.delete(COOKIE_NAME);
}

export async function isAuthed(): Promise<boolean> {
  try {
    requireAdminSecrets();
  } catch {
    return false;
  }
  const store = await cookies();
  const id = decodeSessionCookie(store.get(COOKIE_NAME)?.value);
  if (!id) return false;
  return adminSessionExists(id);
}
