// Единая сессия сайта: cookie с userId + role, HMAC-подпись.
// Сохраняем совместимость со старой admin-cookie (пароль без логина).
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { PublicUser, Role } from "./userStore";
import { countReferrals, findById, toPublic } from "./userStore";

const COOKIE_NAME = "doffa_session";
const LEGACY_ADMIN_COOKIE = "doffa_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дней
const SESSION_VERSION = "v2";

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

type SessionPayload = {
  v: string;
  uid: string;
  role: Role;
  exp: number;
};

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, sign(body))) return null;
  try {
    const raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (raw.v !== SESSION_VERSION || !raw.uid || !raw.role || !raw.exp) return null;
    if (Date.now() > raw.exp) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function createUserSession(userId: string, role: Role): Promise<void> {
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    uid: userId,
    role,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(payload), {
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
  store.delete(LEGACY_ADMIN_COOKIE);
}

/** Текущий пользователь из cookie, или null. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = decodeSession(value);
  if (!payload) return null;
  const user = await findById(payload.uid);
  if (!user) return null;
  // роль из БД важнее cookie — на случай смены прав
  return toPublic(user, await countReferrals(user.id));
}

export async function requireUser(): Promise<PublicUser | null> {
  return getSessionUser();
}

export async function requireAdmin(): Promise<PublicUser | null> {
  const user = await getSessionUser();
  if (user?.role === "admin") return user;
  // Совместимость со старой admin-сессией (пароль без аккаунта)
  if (await isLegacyAdminAuthed()) {
    return {
      id: "legacy-admin",
      username: "admin",
      role: "admin",
      referralCode: "",
      createdAt: 0,
      referralCount: 0,
    };
  }
  return null;
}

/* ---------- legacy admin (пароль из env) ---------- */

const LEGACY_PAYLOAD = "doffa-admin-v1";

function legacyToken(): string {
  return `${LEGACY_PAYLOAD}.${sign(LEGACY_PAYLOAD)}`;
}

/** Пароль верный? Сравнение защищено от timing-атак. */
export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_UPLOAD_PASSWORD?.trim();
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function createLegacyAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(LEGACY_ADMIN_COOKIE, legacyToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function isLegacyAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(LEGACY_ADMIN_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, legacyToken());
}

/** Админ-доступ: аккаунт role=admin ИЛИ старая cookie. */
export async function isAdminAuthed(): Promise<boolean> {
  return (await requireAdmin()) !== null;
}
