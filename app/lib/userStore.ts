// Пользователи сайта: логин/пароль, роли admin|user, реферальные коды.
// Хранение — тот же Blob/локальный JSON, что и для hero-видео.
import { readJsonBlob, writeJsonBlob } from "./blobJson";
import { hashPassword, verifyPassword } from "./password";

const USERS_PATH = "auth/users.json";

export type Role = "admin" | "user";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  referralCode: string;
  referredBy: string | null;
  createdAt: number;
};

export type PublicUser = {
  id: string;
  username: string;
  role: Role;
  referralCode: string;
  createdAt: number;
  referralCount: number;
};

type UsersFile = { users: UserRecord[] };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 24) {
    return "Логин: от 3 до 24 символов";
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return "Логин: только латиница, цифры, . _ -";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return "Пароль: минимум 6 символов";
  if (password.length > 128) return "Пароль слишком длинный";
  return null;
}

function makeReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function load(): Promise<UserRecord[]> {
  const data = await readJsonBlob<UsersFile>(USERS_PATH, { users: [] });
  return Array.isArray(data.users) ? data.users : [];
}

async function save(users: UserRecord[]): Promise<void> {
  await writeJsonBlob(USERS_PATH, { users });
}

export function toPublic(u: UserRecord, referralCount = 0): PublicUser {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    referralCode: u.referralCode,
    createdAt: u.createdAt,
    referralCount,
  };
}

export async function countReferrals(userId: string): Promise<number> {
  const users = await load();
  return users.filter((u) => u.referredBy === userId).length;
}

export async function listReferralUsernames(userId: string): Promise<string[]> {
  const users = await load();
  return users.filter((u) => u.referredBy === userId).map((u) => u.username);
}

export async function findByUsername(username: string): Promise<UserRecord | null> {
  const key = normalizeUsername(username);
  const users = await load();
  return users.find((u) => u.username === key) ?? null;
}

export async function findById(id: string): Promise<UserRecord | null> {
  const users = await load();
  return users.find((u) => u.id === id) ?? null;
}

export async function findByReferralCode(code: string): Promise<UserRecord | null> {
  const key = code.trim().toUpperCase();
  if (!key) return null;
  const users = await load();
  return users.find((u) => u.referralCode === key) ?? null;
}

export async function searchUsers(query: string, limit = 20): Promise<PublicUser[]> {
  const q = normalizeUsername(query);
  if (!q) return [];
  const users = await load();
  const matched = users
    .filter((u) => u.role === "user" && u.username.includes(q))
    .slice(0, limit);
  return Promise.all(
    matched.map(async (u) => toPublic(u, await countReferrals(u.id))),
  );
}

export async function userCount(): Promise<{ total: number; admins: number; users: number }> {
  const users = await load();
  const admins = users.filter((u) => u.role === "admin").length;
  return { total: users.length, admins, users: users.length - admins };
}

export type RegisterInput = {
  username: string;
  password: string;
  role?: Role;
  inviteCode?: string;
  referralCode?: string;
};

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string };

function adminInviteOk(invite?: string): boolean {
  const expected =
    process.env.ADMIN_INVITE_CODE?.trim() || process.env.ADMIN_UPLOAD_PASSWORD?.trim();
  if (!expected || !invite) return false;
  return invite === expected;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const username = normalizeUsername(input.username);
  const userErr = validateUsername(username);
  if (userErr) return { ok: false, error: userErr };
  const passErr = validatePassword(input.password);
  if (passErr) return { ok: false, error: passErr };

  const role: Role = input.role === "admin" ? "admin" : "user";
  if (role === "admin" && !adminInviteOk(input.inviteCode)) {
    return { ok: false, error: "Нужен код приглашения администратора" };
  }

  const users = await load();
  if (users.some((u) => u.username === username)) {
    return { ok: false, error: "Такой логин уже занят" };
  }

  let referredBy: string | null = null;
  if (role === "user" && input.referralCode?.trim()) {
    const referrer = users.find(
      (u) => u.referralCode === input.referralCode!.trim().toUpperCase(),
    );
    if (!referrer) return { ok: false, error: "Реферальный код не найден" };
    if (referrer.username === username) {
      return { ok: false, error: "Нельзя указать свой реферальный код" };
    }
    referredBy = referrer.id;
  }

  let referralCode = makeReferralCode();
  while (users.some((u) => u.referralCode === referralCode)) {
    referralCode = makeReferralCode();
  }

  const record: UserRecord = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(input.password),
    role,
    referralCode,
    referredBy,
    createdAt: Date.now(),
  };

  users.push(record);
  await save(users);
  return { ok: true, user: toPublic(record, 0) };
}

export async function authenticate(
  username: string,
  password: string,
): Promise<UserRecord | null> {
  const user = await findByUsername(username);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}
