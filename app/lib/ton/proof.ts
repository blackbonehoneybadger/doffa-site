// Проверка подписи входа через TON Connect (ton_proof) — серверная сторона.
//
// Что подписывает кошелёк. Не наш текст, а строго заданную структуру: адрес,
// домен сайта, время и наш одноразовый код. Поэтому подпись нельзя утащить с
// другого сайта и предъявить здесь — домен входит в подписанные байты.
//
//   message = "ton-proof-item-v2/"
//           + workchain   (int32, старшим байтом вперёд)
//           + хэш адреса  (32 байта)
//           + длина домена (uint32, младшим байтом вперёд)
//           + домен
//           + время       (uint64, младшим байтом вперёд)
//           + наш код
//
//   подписано = sha256( 0xFFFF + "ton-connect" + sha256(message) )
//
// Порядок байтов разный у разных полей — так в спецификации TON Connect, и
// «исправить» его нельзя: кошелёк считает ровно так, и любое отличие даёт
// несовпадение подписи без объяснения причины.
//
// ЧЕГО ОДНОЙ ПОДПИСИ НЕ ХВАТАЕТ. Кошелёк присылает и адрес, и публичный ключ.
// Подпись доказывает только владение ключом — но не то, что этот ключ
// управляет этим адресом. Без второй проверки любой мог бы подписать своим
// ключом и назваться чужим адресом. Поэтому ключ отдельно сверяется с сетью:
// см. accountPublicKey ниже.

import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import { fetchJson, prop } from "../external/http";

const BASE = "https://tonapi.io/v2";
const ПРЕФИКС = "ton-proof-item-v2/";
const ПОДПИСЬ_ПРЕФИКС = "ton-connect";

/** Сколько живёт подпись. Дольше — краденая подпись работает дольше. */
export const МАКС_ВОЗРАСТ_СЕК = 15 * 60;

export type RawAddress = { workchain: number; hash: Buffer };

/**
 * Разбирает сырой адрес вида «0:9a1b…» (64 шестнадцатеричных знака).
 * Всё остальное — null: адрес неизвестной формы не должен доходить до сверки.
 */
export function разобратьАдрес(raw: string): RawAddress | null {
  const м = /^(-?\d+):([0-9a-fA-F]{64})$/.exec((raw ?? "").trim());
  if (!м) return null;
  const workchain = Number(м[1]);
  // Рабочих цепочек в сети две: основная (0) и мастер (-1). Кошелькам нужна 0.
  if (workchain !== 0 && workchain !== -1) return null;
  return { workchain, hash: Buffer.from(м[2], "hex") };
}

/** CRC16-CCITT (XModem) — контрольная сумма человекочитаемого адреса. */
export function crc16(данные: Buffer): number {
  let crc = 0;
  for (const байт of данные) {
    crc ^= байт << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc & 0xffff;
}

/**
 * Человекочитаемый адрес: «UQ…» для обычного кошелька в основной сети.
 *
 * Показывать человеку сырой «0:9a1b…» нельзя — он не узнает в нём свой адрес
 * и не сверит его с кошельком. Ключом в базе при этом остаётся сырая форма:
 * у человекочитаемой их несколько (EQ и UQ — один и тот же адрес), и сравнивать
 * по ней значит однажды не узнать вернувшегося человека.
 */
export function человекочитаемый(адрес: RawAddress, отскок = false, тестовая = false): string {
  const тег = (отскок ? 0x11 : 0x51) | (тестовая ? 0x80 : 0);
  const тело = Buffer.alloc(34);
  тело[0] = тег;
  тело[1] = адрес.workchain & 0xff;
  адрес.hash.copy(тело, 2);
  const сумма = Buffer.alloc(2);
  сумма.writeUInt16BE(crc16(тело));
  return Buffer.concat([тело, сумма]).toString("base64url");
}

export type TonProof = {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  payload: string;
  signature: string;
};

/** Собирает те самые байты, которые подписал кошелёк. */
export function сообщениеПодписи(адрес: RawAddress, proof: TonProof): Buffer {
  const цепочка = Buffer.alloc(4);
  цепочка.writeInt32BE(адрес.workchain);
  const длинаДомена = Buffer.alloc(4);
  длинаДомена.writeUInt32LE(proof.domain.lengthBytes);
  const время = Buffer.alloc(8);
  время.writeBigUInt64LE(BigInt(proof.timestamp));
  return Buffer.concat([
    Buffer.from(ПРЕФИКС),
    цепочка,
    адрес.hash,
    длинаДомена,
    Buffer.from(proof.domain.value),
    время,
    Buffer.from(proof.payload),
  ]);
}

/** Двойной sha256 с префиксом — то, что реально уходит в ed25519. */
export function дайджест(сообщение: Buffer): Buffer {
  const первый = createHash("sha256").update(сообщение).digest();
  return createHash("sha256")
    .update(Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from(ПОДПИСЬ_ПРЕФИКС), первый]))
    .digest();
}

export type ПроверкаВхода = {
  address: string;
  publicKey: string;
  proof: TonProof;
};

export type Условия = {
  /** Домены, с которых вход принимается. Чужой домен — чужая подпись. */
  домены: string[];
  /** Код, который сервер выдал этому входу. */
  код: string;
  сейчасМс?: number;
  максВозрастСек?: number;
};

export type Итог = { ok: true; raw: RawAddress } | { ok: false; причина: string };

/**
 * Проверяет всё, что можно проверить без сети: форму, домен, свежесть, код и
 * саму подпись. Причина отказа называется словами — но наружу её отдавать не
 * надо: подсказка «домен не тот» помогает только тому, кто подбирает.
 */
export function проверитьПодпись(вход: ПроверкаВхода, условия: Условия): Итог {
  const raw = разобратьАдрес(вход.address);
  if (!raw) return { ok: false, причина: "адрес не разобран" };

  const ключ = Buffer.from((вход.publicKey ?? "").trim(), "hex");
  if (ключ.length !== 32) return { ok: false, причина: "публичный ключ не 32 байта" };

  const proof = вход.proof;
  if (!proof || typeof proof.timestamp !== "number" || !Number.isFinite(proof.timestamp))
    return { ok: false, причина: "время подписи отсутствует" };
  if (!proof.domain || typeof proof.domain.value !== "string")
    return { ok: false, причина: "домен отсутствует" };

  // Длина домена входит в подписанные байты. Если она не совпадает с самим
  // доменом, подпись всё равно не сойдётся — но лучше сказать это здесь, чем
  // отдать невнятное «подпись не совпала».
  if (Buffer.byteLength(proof.domain.value) !== proof.domain.lengthBytes)
    return { ok: false, причина: "длина домена не совпадает с доменом" };

  if (!условия.домены.includes(proof.domain.value))
    return { ok: false, причина: "подпись выдана другому сайту" };

  // Код обязан быть тем самым, что выдал сервер. Сравниваем целиком: подпись
  // покрывает код, поэтому подменить его по дороге нельзя, а вот предъявить
  // подпись со старым кодом — можно.
  if (proof.payload !== условия.код) return { ok: false, причина: "код не тот" };

  const сейчас = условия.сейчасМс ?? Date.now();
  const возраст = сейчас / 1000 - proof.timestamp;
  const предел = условия.максВозрастСек ?? МАКС_ВОЗРАСТ_СЕК;
  if (возраст > предел) return { ok: false, причина: "подпись просрочена" };
  // Время из будущего — либо сбитые часы, либо попытка продлить срок годности.
  // Минуту вперёд прощаем: часы у телефонов расходятся.
  if (возраст < -60) return { ok: false, причина: "время подписи из будущего" };

  const подпись = Buffer.from((proof.signature ?? "").trim(), "base64");
  if (подпись.length !== 64) return { ok: false, причина: "подпись не 64 байта" };

  const ок = nacl.sign.detached.verify(
    new Uint8Array(дайджест(сообщениеПодписи(raw, proof))),
    new Uint8Array(подпись),
    new Uint8Array(ключ),
  );
  return ок ? { ok: true, raw } : { ok: false, причина: "подпись не совпала" };
}

/** Разбор ответа /v2/accounts/{address}/publickey. */
export function разобратьКлюч(json: unknown): string | null {
  const ключ = prop(json, "public_key") ?? prop(json, "publicKey");
  return typeof ключ === "string" && /^[0-9a-fA-F]{64}$/.test(ключ.trim())
    ? ключ.trim().toLowerCase()
    : null;
}

/**
 * Публичный ключ адреса по данным сети.
 *
 * Это вторая половина проверки, без которой первая ничего не стоит: подпись
 * доказывает владение ключом, а сеть — что ключ управляет этим адресом.
 *
 * null означает «сеть не ответила», и вход обязан на этом закончиться отказом.
 * Пропустить человека, не сумев проверить, — это не осторожность, а дыра.
 */
export async function ключАдреса(адрес: string, fetchImpl?: typeof fetch): Promise<string | null> {
  const key = process.env.TONAPI_KEY?.trim();
  const json = await fetchJson(`${BASE}/accounts/${encodeURIComponent(адрес)}/publickey`, {
    revalidate: 0,
    noStore: true,
    headers: key ? { authorization: `Bearer ${key}` } : undefined,
    fetchImpl,
  });
  return разобратьКлюч(json);
}
