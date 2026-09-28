import { test } from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import {
  crc16,
  дайджест,
  ключАдреса,
  МАКС_ВОЗРАСТ_СЕК,
  проверитьПодпись,
  разобратьАдрес,
  разобратьКлюч,
  сообщениеПодписи,
  человекочитаемый,
  type TonProof,
} from "../app/lib/ton/proof";

// Ключ подписи выдуман прямо здесь: сеть в проверках не нужна, а подпись
// обязана быть настоящей — иначе мы проверяем не проверку, а самих себя.
const ПАРА = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(7));
const КЛЮЧ = Buffer.from(ПАРА.publicKey).toString("hex");
const АДРЕС = "0:" + "ab".repeat(32);
const ДОМЕН = "doffa.coffee";
const КОД = "нашодноразовыйкод";
const СЕЙЧАС = 1_770_000_000_000;

function подписать(изменения: Partial<TonProof> = {}, ключПодписи = ПАРА.secretKey): TonProof {
  const proof: TonProof = {
    timestamp: Math.floor(СЕЙЧАС / 1000),
    domain: { lengthBytes: Buffer.byteLength(ДОМЕН), value: ДОМЕН },
    payload: КОД,
    signature: "",
    ...изменения,
  };
  const raw = разобратьАдрес(АДРЕС)!;
  const подпись = nacl.sign.detached(new Uint8Array(дайджест(сообщениеПодписи(raw, proof))), ключПодписи);
  return { ...proof, signature: Buffer.from(подпись).toString("base64") };
}

const условия = (изм: Record<string, unknown> = {}) =>
  ({ домены: [ДОМЕН], код: КОД, сейчасМс: СЕЙЧАС, ...изм }) as Parameters<typeof проверитьПодпись>[1];

test("настоящая подпись принимается", () => {
  const итог = проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof: подписать() }, условия());
  assert.equal(итог.ok, true);
});

test("подпись чужим ключом не проходит", () => {
  const чужой = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(9));
  const proof = подписать({}, чужой.secretKey);
  const итог = проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия());
  assert.deepEqual(итог, { ok: false, причина: "подпись не совпала" });
});

test("подпись, выданная другому сайту, не принимается", () => {
  // Главная защита: домен входит в подписанные байты, поэтому подпись со
  // стороннего сайта здесь бесполезна, даже будучи настоящей.
  const чужойДомен = "zloy-sayt.example";
  const proof = подписать({ domain: { lengthBytes: Buffer.byteLength(чужойДомен), value: чужойДомен } });
  const итог = проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия());
  assert.deepEqual(итог, { ok: false, причина: "подпись выдана другому сайту" });
});

test("подпись со старым кодом не принимается", () => {
  const proof = подписать({ payload: "старыйкод" });
  const итог = проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия());
  assert.deepEqual(итог, { ok: false, причина: "код не тот" });
});

test("просроченная подпись не принимается", () => {
  const proof = подписать({ timestamp: Math.floor(СЕЙЧАС / 1000) - МАКС_ВОЗРАСТ_СЕК - 1 });
  const итог = проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия());
  assert.deepEqual(итог, { ok: false, причина: "подпись просрочена" });
});

test("подпись на границе срока ещё принимается", () => {
  const proof = подписать({ timestamp: Math.floor(СЕЙЧАС / 1000) - МАКС_ВОЗРАСТ_СЕК });
  assert.equal(проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия()).ok, true);
});

test("время из будущего отклоняется, но минуту расхождения прощаем", () => {
  const вперёдМинуту = подписать({ timestamp: Math.floor(СЕЙЧАС / 1000) + 59 });
  assert.equal(проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof: вперёдМинуту }, условия()).ok, true);
  const вперёдЧас = подписать({ timestamp: Math.floor(СЕЙЧАС / 1000) + 3600 });
  assert.deepEqual(проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof: вперёдЧас }, условия()),
    { ok: false, причина: "время подписи из будущего" });
});

test("длина домена обязана совпадать с самим доменом", () => {
  const proof = подписать({ domain: { lengthBytes: 3, value: ДОМЕН } });
  assert.deepEqual(проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof }, условия()),
    { ok: false, причина: "длина домена не совпадает с доменом" });
});

test("подпись под чужим адресом не проходит", () => {
  // Байты подписи включают хэш адреса, поэтому подставить другой адрес
  // к готовой подписи нельзя.
  const другой = "0:" + "cd".repeat(32);
  const итог = проверитьПодпись({ address: другой, publicKey: КЛЮЧ, proof: подписать() }, условия());
  assert.deepEqual(итог, { ok: false, причина: "подпись не совпала" });
});

test("мусор вместо адреса, ключа и подписи отклоняется по форме", () => {
  const proof = подписать();
  assert.deepEqual(проверитьПодпись({ address: "не адрес", publicKey: КЛЮЧ, proof }, условия()),
    { ok: false, причина: "адрес не разобран" });
  assert.deepEqual(проверитьПодпись({ address: АДРЕС, publicKey: "аб", proof }, условия()),
    { ok: false, причина: "публичный ключ не 32 байта" });
  assert.deepEqual(проверитьПодпись({ address: АДРЕС, publicKey: КЛЮЧ, proof: { ...proof, signature: "кк" } }, условия()),
    { ok: false, причина: "подпись не 64 байта" });
});

test("чужая рабочая цепочка не принимается", () => {
  assert.equal(разобратьАдрес("5:" + "ab".repeat(32)), null);
  assert.ok(разобратьАдрес("-1:" + "ab".repeat(32)));
  assert.equal(разобратьАдрес("0:" + "ab".repeat(31)), null);
});

test("человекочитаемый адрес совпадает с настоящим кошельком", () => {
  // Самая честная проверка кодировщика: берём адрес фонда наград игры — его
  // строку выдал настоящий кошелёк, — разбираем и собираем заново. Сойдётся
  // только если верны и порядок байтов, и тег, и контрольная сумма.
  const строка = "UQCnClctLMcB1xBoHETl-Dzp6cLRv9oWUmz_nqz6IBYepJLH";
  const байты = Buffer.from(строка, "base64url");
  assert.equal(байты.length, 36);
  assert.equal(байты[0], 0x51, "обычный кошелёк основной сети — тег 0x51");
  const raw = { workchain: байты[1], hash: байты.subarray(2, 34) };
  assert.equal(человекочитаемый(raw, false), строка);
  // Контрольная сумма из самой строки обязана сойтись с посчитанной.
  assert.equal(байты.readUInt16BE(34), crc16(байты.subarray(0, 34)));
});

test("нулевой адрес сети даёт известную строку", () => {
  const ноль = разобратьАдрес("0:" + "00".repeat(32))!;
  assert.equal(человекочитаемый(ноль, true), "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c");
  assert.equal(человекочитаемый(ноль, false), "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ");
});

test("контрольная сумма адреса — XModem", () => {
  assert.equal(crc16(Buffer.from("123456789")), 0x31c3);
  assert.equal(crc16(Buffer.alloc(0)), 0);
});

test("публичный ключ из ответа сети разбирается, мусор — нет", () => {
  assert.equal(разобратьКлюч({ public_key: "AB".repeat(32) }), "ab".repeat(32));
  assert.equal(разобратьКлюч({ publicKey: "cd".repeat(32) }), "cd".repeat(32));
  for (const мусор of [null, {}, { public_key: "" }, { public_key: "zz".repeat(32) }, { public_key: "ab" }])
    assert.equal(разобратьКлюч(мусор), null, JSON.stringify(мусор));
});

test("сеть не ответила — ключа нет, и вход обязан на этом закончиться", async () => {
  const упасть = (async () => {
    throw new Error("сеть недоступна");
  }) as unknown as typeof fetch;
  assert.equal(await ключАдреса(АДРЕС, упасть), null);
});

test("ключ из сети читается настоящим ответом", async () => {
  const ответ = (async () =>
    new Response(JSON.stringify({ public_key: КЛЮЧ }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
  assert.equal(await ключАдреса(АДРЕС, ответ), КЛЮЧ.toLowerCase());
});
