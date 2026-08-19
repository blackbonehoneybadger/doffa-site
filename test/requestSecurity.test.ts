import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clientIp,
  hasTrustedRequestOrigin,
  visitorFingerprint,
} from "../app/lib/requestSecurity";

function request(headers: Record<string, string> = {}, url = "https://doffa.coffee/api/test") {
  return new Request(url, { headers });
}

test("clientIp: системный Vercel IP имеет приоритет над обычным forwarded", () => {
  const req = request({
    "x-vercel-forwarded-for": "203.0.113.7",
    "x-forwarded-for": "198.51.100.9, 10.0.0.1",
  });
  assert.equal(clientIp(req), "203.0.113.7");
});

test("clientIp: мусор и управляющие строки не попадают в служебный ключ", () => {
  assert.equal(clientIp(request({ "x-forwarded-for": "attacker-value" })), "unknown");
  assert.equal(clientIp(request({})), "unknown");
});

test("origin: свой origin и корректный forwarded origin разрешены", () => {
  assert.equal(
    hasTrustedRequestOrigin(request({ origin: "https://doffa.coffee" })),
    true,
  );
  assert.equal(
    hasTrustedRequestOrigin(
      request(
        {
          origin: "https://doffa.coffee",
          "x-forwarded-host": "doffa.coffee",
          "x-forwarded-proto": "https",
        },
        "http://internal:3000/api/test",
      ),
    ),
    true,
  );
});

test("origin: чужой/null/cross-site запрос отклоняется", () => {
  assert.equal(
    hasTrustedRequestOrigin(request({ origin: "https://attacker.example" })),
    false,
  );
  assert.equal(hasTrustedRequestOrigin(request({ origin: "null" })), false);
  assert.equal(
    hasTrustedRequestOrigin(request({ "sec-fetch-site": "cross-site" })),
    false,
  );
});

test("origin: server-to-server запрос без браузерных заголовков допускается", () => {
  assert.equal(hasTrustedRequestOrigin(request()), true);
});

test("visitorFingerprint: стабилен, необратим и меняется для другого клиента", () => {
  const a = request({ "x-vercel-forwarded-for": "203.0.113.7", "user-agent": "UA-1" });
  const b = request({ "x-vercel-forwarded-for": "203.0.113.8", "user-agent": "UA-1" });
  const first = visitorFingerprint(a, "test-secret");
  assert.equal(first, visitorFingerprint(a, "test-secret"));
  assert.notEqual(first, visitorFingerprint(b, "test-secret"));
  assert.equal(first.length, 64);
  assert.equal(first.includes("203.0.113.7"), false);
});
