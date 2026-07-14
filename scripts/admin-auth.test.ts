// Тесты Track B: админ-сессии, rate limit, пароль, отзыв, просрочка.
// Запуск: npm test  (нужен DATABASE_URL в окружении или .env.local)
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i);
      const v = t.slice(i + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();
process.env.NODE_ENV = "test";
if (!process.env.ADMIN_SESSION_SECRET) {
  process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString("hex");
}
if (!process.env.ADMIN_UPLOAD_PASSWORD) {
  process.env.ADMIN_UPLOAD_PASSWORD = "test-admin-password-track-b";
}

import {
  checkPassword,
  encodeSessionCookie,
  decodeSessionCookie,
  insertAdminSession,
  adminSessionExists,
  revokeAdminSession,
  recordLoginAttempt,
  isIpLockedOut,
  cleanupAdminAuthDebris,
  MAX_FAILED_ATTEMPTS,
  COOKIE_NAME,
} from "../app/lib/adminAuthCore";
import { query } from "../app/lib/db";

const TEST_PREFIX = `test_track_b_${randomBytes(4).toString("hex")}`;

describe("Track B admin auth", () => {
  before(async () => {
    assert.ok(process.env.DATABASE_URL || process.env.POSTGRES_URL, "нужен DATABASE_URL");
    await cleanupAdminAuthDebris();
  });

  after(async () => {
    await query(`delete from admin_sessions where id like $1`, [`${TEST_PREFIX}%`]).catch(() => {});
    await query(`delete from admin_login_attempts where ip like $1`, [`${TEST_PREFIX}%`]).catch(() => {});
  });

  it("rejects wrong password", () => {
    assert.equal(checkPassword("totally-wrong-password"), false);
    assert.equal(checkPassword(process.env.ADMIN_UPLOAD_PASSWORD!), true);
  });

  it("signs opaque cookie and rejects tampering", () => {
    const id = `${TEST_PREFIX}_sess_${randomBytes(8).toString("hex")}`;
    const cookie = encodeSessionCookie(id);
    assert.equal(decodeSessionCookie(cookie), id);
    assert.equal(decodeSessionCookie(`${id}.deadbeef`), null);
    assert.equal(decodeSessionCookie("not-a-cookie"), null);
    assert.equal(decodeSessionCookie(""), null);
  });

  it("creates session row and revokes on logout", async () => {
    const id = `${TEST_PREFIX}_live_${randomBytes(8).toString("hex")}`;
    await insertAdminSession({
      id,
      expiresAtMs: Date.now() + 60_000,
      ip: `${TEST_PREFIX}_ip`,
    });
    assert.equal(await adminSessionExists(id), true);
    await revokeAdminSession(id);
    assert.equal(await adminSessionExists(id), false);
  });

  it("rejects expired session", async () => {
    const id = `${TEST_PREFIX}_exp_${randomBytes(8).toString("hex")}`;
    await insertAdminSession({
      id,
      expiresAtMs: Date.now() - 60_000,
      ip: `${TEST_PREFIX}_ip`,
    });
    assert.equal(await adminSessionExists(id), false);
    assert.equal(decodeSessionCookie(encodeSessionCookie(id)), id);
  });

  it("locks IP after repeated failed logins", async () => {
    const ip = `${TEST_PREFIX}_lock_${randomBytes(3).toString("hex")}`;
    assert.equal(await isIpLockedOut(ip), false);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await recordLoginAttempt(ip, false);
    }
    assert.equal(await isIpLockedOut(ip), true);
  });

  it("cookie name is admin-specific", () => {
    assert.equal(COOKIE_NAME, "doffa_admin_session");
  });
});
