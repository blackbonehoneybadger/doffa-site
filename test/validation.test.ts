import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  merchOrderSchema,
  parseJson,
  readJsonBody,
} from "../app/lib/validation";

function jsonRequest(body: string, contentType = "application/json") {
  return new Request("https://doffa.coffee/api/test", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

test("readJsonBody: корректный JSON разбирается", async () => {
  const result = await readJsonBody(jsonRequest('{"ok":true}'));
  assert.deepEqual(result, { ok: true, data: { ok: true } });
});

test("readJsonBody: реальный размер chunked body ограничен", async () => {
  const result = await readJsonBody(jsonRequest(JSON.stringify({ value: "x".repeat(100) })), 32);
  assert.deepEqual(result, {
    ok: false,
    error: "Тело запроса слишком большое",
    status: 413,
  });
});

test("readJsonBody: чужой content-type и битый JSON отклоняются", async () => {
  const wrongType = await readJsonBody(jsonRequest("{}", "text/plain"));
  const broken = await readJsonBody(jsonRequest("{"));
  assert.equal(wrongType.ok, false);
  assert.equal(broken.ok, false);
  if (!wrongType.ok) assert.equal(wrongType.status, 415);
  if (!broken.ok) assert.equal(broken.status, 400);
});

test("parseJson: применяет runtime-схему и возвращает нормализованные данные", async () => {
  const schema = z.object({ name: z.string().trim().min(1) });
  const result = await parseJson(jsonRequest('{"name":"  DOFFA  "}'), schema);
  assert.deepEqual(result, { ok: true, data: { name: "DOFFA" } });
});

test("merch honeypot: заполненное поле проходит схему для тихого discard", () => {
  const result = merchOrderSchema.safeParse({
    name: "Bot",
    contact: "bot@example.test",
    consent: true,
    website: "https://spam.example",
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(Boolean(result.data.website), true);
});
