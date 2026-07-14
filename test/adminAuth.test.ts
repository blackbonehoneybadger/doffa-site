// Юнит-тесты чистой крипто-логики админ-входа (без БД и Next-рантайма).
// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signId,
  verifyCookie,
  passwordMatches,
  shouldLock,
  constantTimeEqual,
} from "../app/lib/adminAuthCore";
import { adminLoginSchema } from "../app/lib/validation";

const SECRET = "test-admin-secret";

test("passwordMatches: правильный / неправильный / не задан", () => {
  assert.equal(passwordMatches("hunter2", "hunter2"), true);
  assert.equal(passwordMatches("wrong", "hunter2"), false);
  // Пароль не задан в окружении → любой ввод отклоняется (fail-closed).
  assert.equal(passwordMatches("anything", null), false);
  assert.equal(passwordMatches("", ""), false);
});

test("adminLoginSchema: отклоняет мусор, принимает валидное", () => {
  assert.equal(adminLoginSchema.safeParse({ password: "ok" }).success, true);
  assert.equal(adminLoginSchema.safeParse({}).success, false);
  assert.equal(adminLoginSchema.safeParse({ password: "" }).success, false);
  assert.equal(adminLoginSchema.safeParse({ password: 123 }).success, false);
  assert.equal(adminLoginSchema.safeParse({ password: "x".repeat(1000) }).success, false);
});

test("cookie: подпись проходит round-trip", () => {
  const id = "abc123";
  const cookie = `${id}.${signId(id, SECRET)}`;
  assert.equal(verifyCookie(cookie, SECRET), id);
});

test("cookie: подделанная подпись отклоняется", () => {
  assert.equal(verifyCookie("abc123.deadbeef", SECRET), null);
});

test("cookie: чужой секрет отклоняется (нельзя переиспользовать пользовательский)", () => {
  const id = "abc123";
  const cookie = `${id}.${signId(id, SECRET)}`;
  assert.equal(verifyCookie(cookie, "other-secret"), null);
});

test("cookie: мусор без валидной структуры отклоняется", () => {
  assert.equal(verifyCookie("nodot", SECRET), null);
  assert.equal(verifyCookie("", SECRET), null);
  assert.equal(verifyCookie(".sigonly", SECRET), null);
});

test("shouldLock: блокировка срабатывает на пороге", () => {
  assert.equal(shouldLock(6, 7), false);
  assert.equal(shouldLock(7, 7), true);
  assert.equal(shouldLock(8, 7), true);
});

test("constantTimeEqual: разная длина → false, одинаковые → true", () => {
  assert.equal(constantTimeEqual("a", "ab"), false);
  assert.equal(constantTimeEqual("abc", "abc"), true);
});
