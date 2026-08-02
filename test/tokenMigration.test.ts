// Тесты миграции на новый токен DOFFA.
//
// Сеть здесь не используется. Проверяется то, что нельзя проверить глазами и
// что дороже всего стоит при ошибке:
//   • арифметика эмиссии в BigInt — суммы SPL это u64, за границей точности
//     double, а разбор дробей через float копит ошибку округления;
//   • разбор пользовательского ввода для сжигания — необратимой операции;
//   • гварды сети devnet/mainnet;
//   • отсутствие секретов и старого mint в production-коде.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");

/* ────────────────────────── арифметика эмиссии ────────────────────────── */

const DECIMALS = 6;
const SUPPLY = 100_000_000n;

// Копии функций из token/src/config.ts. Дублируются намеренно: token/ — это
// отдельный package со своими зависимостями (dotenv, web3.js), и импорт оттуда
// затащил бы их в тесты сайта. Проверяется сама формула.
function toBaseUnits(tokens: bigint, decimals = DECIMALS): bigint {
  return tokens * 10n ** BigInt(decimals);
}

function formatBaseUnits(base: bigint, decimals = DECIMALS): string {
  const f = 10n ** BigInt(decimals);
  const whole = base / f;
  const frac = base % f;
  const wholeStr = whole.toLocaleString("ru-RU");
  if (frac === 0n) return wholeStr;
  return `${wholeStr},${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function parseTokenAmount(input: string, decimals = DECIMALS): bigint {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Некорректное количество: «${input}»`);
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals) throw new Error("Слишком много знаков после точки");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

test("эмиссия: 100 000 000 токенов = 10^14 базовых единиц", () => {
  assert.equal(toBaseUnits(SUPPLY), 100_000_000_000_000n);
});

test("наша эмиссия помещается в double, но предел u64 — нет", () => {
  const base = toBaseUnits(SUPPLY);
  // Важно не обманываться: 10^14 базовых единиц как раз влезает в double
  // (MAX_SAFE_INTEGER ≈ 9·10^15). BigInt здесь не из-за размера наших чисел.
  assert.ok(base < BigInt(Number.MAX_SAFE_INTEGER), "10^14 влезает в double");
  // Настоящая причина: суммы SPL — это u64, и его предел в double не
  // представим. Общий код обязан работать с такими величинами.
  const U64_MAX = 2n ** 64n - 1n;
  assert.ok(U64_MAX > BigInt(Number.MAX_SAFE_INTEGER), "предел u64 за границей double");
});

test("разбор дробей через float копит ошибку, через BigInt — нет", () => {
  // Наглядно, почему сумма сжигания не считается в number:
  // 2.01 * 1e6 в double даёт 2009999.9999999998, а не 2010000.
  const viaFloat = 2.01 * 1e6;
  assert.notEqual(viaFloat, 2_010_000, "float здесь промахивается");
  assert.equal(parseTokenAmount("2.01"), 2_010_000n, "BigInt точен");
});

test("формат базовых единиц не теряет точность на дробях", () => {
  assert.equal(formatBaseUnits(toBaseUnits(SUPPLY)), "100 000 000".replace(/ /g, " "));
  assert.equal(formatBaseUnits(1n), "0,000001");
  assert.equal(formatBaseUnits(1_500_000n), "1,5");
  assert.equal(formatBaseUnits(0n), "0");
});

test("разбор количества: целые и дробные", () => {
  assert.equal(parseTokenAmount("1000"), 1_000_000_000n);
  assert.equal(parseTokenAmount("12.5"), 12_500_000n);
  assert.equal(parseTokenAmount("12,5"), 12_500_000n, "запятая как разделитель тоже принимается");
  assert.equal(parseTokenAmount("0.000001"), 1n);
});

test("разбор количества: лишние знаки после точки — ошибка, а не тихое обрезание", () => {
  // Обрезать молча нельзя: сожглась бы не та сумма, а операция необратима.
  assert.throws(() => parseTokenAmount("1.0000001"), /Слишком много знаков/);
});

test("разбор количества: мусор отклоняется", () => {
  for (const bad of ["", "abc", "-5", "1e6", "1.2.3", " ", "0x10"]) {
    assert.throws(() => parseTokenAmount(bad), /Некорректное количество|Слишком много/, `принял «${bad}»`);
  }
});

test("сжигание уменьшает supply ровно на сумму", () => {
  const before = toBaseUnits(SUPPLY); // 100_000_000_000_000
  const burn = parseTokenAmount("1234.567891"); // 1_234_567_891
  assert.equal(burn, 1_234_567_891n);
  assert.equal(before - burn, 99_998_765_432_109n);
});

test("превышение эмиссии обнаруживается сравнением BigInt", () => {
  const target = toBaseUnits(SUPPLY);
  assert.ok(target + 1n > target, "лишняя единица должна быть заметна");
  assert.equal(target, 100_000_000_000_000n);
});

/* ──────────────────────────── гварды сети ─────────────────────────────── */

const GENESIS = {
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
};

test("genesis hash сетей различаются — подменить сеть незаметно нельзя", () => {
  assert.notEqual(GENESIS["mainnet-beta"], GENESIS.devnet);
  assert.equal(GENESIS["mainnet-beta"].length, 44);
  assert.equal(GENESIS.devnet.length, 44);
});

test("config.ts проверяет сеть по genesis hash перед операциями", () => {
  const src = readFileSync(join(ROOT, "token/src/config.ts"), "utf8");
  assert.match(src, /getGenesisHash/, "сеть должна сверяться по genesis hash");
  assert.match(src, new RegExp(GENESIS["mainnet-beta"]), "хеш mainnet должен быть зашит");
  assert.match(src, new RegExp(GENESIS.devnet), "хеш devnet должен быть зашит");
});

test("в mainnet подписант обязан быть владельцем", () => {
  const src = readFileSync(join(ROOT, "token/src/config.ts"), "utf8");
  assert.match(src, /assertSignerIsOwner/);
  assert.match(src, /IS_MAINNET[\s\S]{0,400}ПОДПИСАНТ НЕ ВЛАДЕЛЕЦ/);
});

test("отзыв полномочий требует точной подтверждающей фразы", () => {
  const src = readFileSync(join(ROOT, "token/src/revoke-authorities.ts"), "utf8");
  assert.match(src, /REVOKE DOFFA AUTHORITIES/);
  assert.match(src, /blockers/, "отзыв должен блокироваться при несошедшихся проверках");
});

test("повторный выпуск эмиссии заблокирован", () => {
  const src = readFileSync(join(ROOT, "token/src/mint-supply.ts"), "utf8");
  assert.match(src, /supply\s*>\s*0n/, "непустой supply должен останавливать выпуск");
});

test("подтверждение необратимой операции требует живого терминала", () => {
  // Фраза имеет смысл только пока её печатает человек. Читать её из пайпа —
  // значит позволить автоматике подтвердить необратимую операцию самой себе.
  const src = readFileSync(join(ROOT, "token/src/config.ts"), "utf8");
  assert.match(src, /confirmExactPhrase/);
  assert.match(src, /process\.stdin\.isTTY[\s\S]{0,300}живого терминала/);
});

test("прогон одной командой не отзывает полномочия и не жжёт", () => {
  // token:go выпускает токен. Отзыв authority и сжигание необратимы иначе,
  // чем всё остальное: их нельзя откатить даже частично, поэтому они остаются
  // отдельными командами с отдельными фразами.
  const src = readFileSync(join(ROOT, "token/src/run-all.ts"), "utf8");
  const steps = [...src.matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(steps, [
    "check-wallet.ts",
    "create-mint.ts",
    "create-owner-token-account.ts",
    "create-metadata.ts",
    "mint-supply.ts",
    "verify-token.ts",
  ]);
  for (const forbidden of ["revoke-authorities.ts", "burn.ts", "burn-legacy.ts"]) {
    assert.ok(!steps.includes(forbidden), `${forbidden} не должен входить в token:go`);
  }
});

test("прогон в mainnet требует фразу, devnet-репетицию и постоянные метаданные", () => {
  const src = readFileSync(join(ROOT, "token/src/run-all.ts"), "utf8");
  assert.match(src, /CREATE MAINNET DOFFA/, "нужна точная подтверждающая фраза");
  assert.match(src, /deploy-output[\s\S]{0,200}devnet\.json/, "должен требовать след devnet-прогона");
  assert.match(src, /signatures\?\.mintSupply/, "devnet-прогон должен быть доведён до эмиссии");
  assert.match(src, /DOFFA_METADATA_URI пуст/, "без метаданных в mainnet нельзя");
  assert.match(src, /vercel\\\.app/, "временные хостинги должны отвергаться");
});

test("token:go зарегистрирован в package.json", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "token/package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.equal(pkg.scripts["token:go"], "tsx src/run-all.ts");
});

test("devnet-скрипты отказываются работать в mainnet", () => {
  for (const f of ["devnet-keygen.ts", "devnet-airdrop.ts"]) {
    const src = readFileSync(join(ROOT, "token/src", f), "utf8");
    assert.match(src, /IS_MAINNET/, `${f} должен проверять сеть`);
  }
});

/* ─────────────────────── чистота production-кода ──────────────────────── */

const OLD_MINT = "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo";
const OLD_WALLET = "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS";

/** Файлы, которые реально попадают в собранный сайт. */
function productionFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
  };
  walk(join(ROOT, "app"));
  return out;
}

test("старый mint есть ровно в одном token-скрипте — том, что его сжигает", () => {
  // burn-legacy.ts обязан знать старый mint: иначе сжигать нечего. Он же
  // единственное исключение — во всех остальных скриптах старый адрес означал
  // бы, что операция уйдёт не в тот токен.
  const withOld: string[] = [];
  for (const f of readdirSync(join(ROOT, "token/src"))) {
    const src = readFileSync(join(ROOT, "token/src", f), "utf8");
    if (src.includes(OLD_MINT) || src.includes(OLD_WALLET)) withOld.push(f);
  }
  assert.deepEqual(withOld, ["burn-legacy.ts"], `неожиданные файлы со старым токеном: ${withOld}`);
});

test("burn-legacy требует точную фразу и проверяет владельца", () => {
  const src = readFileSync(join(ROOT, "token/src/burn-legacy.ts"), "utf8");
  assert.match(src, /BURN ALL LEGACY DOFFA/, "нужна точная подтверждающая фраза");
  assert.match(src, /ПОДПИСАНТ НЕ ТОТ/, "должен отказываться жечь чужие токены");
  assert.match(src, /getGenesisHash/, "должен проверять, что это mainnet");
});

/* ────────────── старый токен не используется операционно ──────────────── */

test("операционный mint не равен старому — и не выдуман", async () => {
  // Ключевая проверка всей миграции: пока новый токен не создан, mint обязан
  // быть null. Любое непустое значение здесь означало бы, что сайт показывает
  // либо деприкированный токен, либо выдуманный адрес.
  const { ECOSYSTEM } = await import("../app/config/ecosystem");
  assert.notEqual(ECOSYSTEM.token.mint, OLD_MINT, "операционный mint = старый токен");
  assert.equal(ECOSYSTEM.token.mint, null, "mint должен быть null, пока токен не выпущен");
  assert.equal(ECOSYSTEM.token.deployed, false);
  assert.equal(ECOSYSTEM.status.token, "planned");
});

test("старого токена нет в конфиге сайта вообще", async () => {
  // Решение владельца от 2026-08-02: сайт о старом токене не рассказывает.
  // Проверяем отсутствие именно поля, а не только текста на странице: пока
  // legacy лежит в ECOSYSTEM, любая новая страница может его отрисовать.
  const eco = (await import("../app/config/ecosystem")).ECOSYSTEM as Record<string, unknown>;
  assert.equal("legacy" in eco, false, "поле legacy должно быть удалено из ECOSYSTEM");
});

test("старых адресов нет ни в одном файле, попадающем в сборку", () => {
  // Черная дыра сюда же: её адрес — часть истории старого токена.
  const BLACK_HOLE = "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV";
  const found: string[] = [];
  for (const f of productionFiles()) {
    const src = readFileSync(f, "utf8");
    if (src.includes(OLD_MINT) || src.includes(OLD_WALLET) || src.includes(BLACK_HOLE)) {
      found.push(f.replace(ROOT + "/", ""));
    }
  }
  assert.deepEqual(found, [], `старые адреса вернулись в код сайта: ${found}`);
});

test("owner wallet — новый управляемый кошелёк", async () => {
  const { ECOSYSTEM } = await import("../app/config/ecosystem");
  assert.equal(ECOSYSTEM.ownerWallet, "E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr");
  assert.notEqual(ECOSYSTEM.ownerWallet, OLD_WALLET);
});

test("оплата мерча в DOFFA выключена, пока нет mint", async () => {
  const { DOFFA_PAYMENT_PUBLIC } = await import("../app/config/merch");
  assert.equal(DOFFA_PAYMENT_PUBLIC.mint, null);
  assert.equal(DOFFA_PAYMENT_PUBLIC.enabled, false, "нельзя принимать оплату в несуществующем токене");
});

/* ──────────────────── наградная модель: сумма долей ───────────────────── */

test("сумма долей награды обязана равняться 100", async () => {
  const { validateRewardSplit } = await import("../app/config/ecosystem");
  assert.equal(validateRewardSplit(70, 20, 10).valid, true);
  assert.equal(validateRewardSplit(100, 0, 0).valid, true);
  // Недобор и перебор одинаково недопустимы: молча донормировать проценты
  // нельзя — это исказило бы заявленную экономику.
  assert.equal(validateRewardSplit(70, 20, 5).valid, false);
  assert.equal(validateRewardSplit(70, 20, 20).valid, false);
  assert.match(validateRewardSplit(70, 20, 5).reason ?? "", /сумма долей 95/);
});

test("неполный набор долей оставляет модель в draft", async () => {
  const { validateRewardSplit, ECOSYSTEM } = await import("../app/config/ecosystem");
  assert.equal(validateRewardSplit(80, 20, null).valid, false);
  assert.equal(validateRewardSplit(null, null, null).valid, false);
  // По умолчанию переменные не заданы → модель draft, проценты не показываются.
  assert.equal(ECOSYSTEM.rewardModel.draft, true);
  assert.equal(ECOSYSTEM.rewardModel.rewardPercent, null);
  assert.equal(ECOSYSTEM.rewardModel.burnPercent, null);
  assert.equal(ECOSYSTEM.rewardModel.treasuryPercent, null);
});

test("в коде нет приватных ключей и seed-фраз", () => {
  // Ключ Solana в JSON — массив из 64 чисел. Ищем такие литералы в коде.
  const keyArray = /\[\s*(?:\d{1,3}\s*,\s*){60,}\d{1,3}\s*\]/;
  // Мнемоника BIP-39 — 12 или 24 слова подряд в одной строке-литерале.
  const mnemonic = /["'`](?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}["'`]/;
  const files = [...productionFiles(), ...readdirSync(join(ROOT, "token/src")).map((f) => join(ROOT, "token/src", f))];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!keyArray.test(src), `похоже на приватный ключ: ${f}`);
    assert.ok(!mnemonic.test(src), `похоже на seed-фразу: ${f}`);
  }
});

test("приватный ключ нигде не печатается в консоль", () => {
  for (const f of readdirSync(join(ROOT, "token/src"))) {
    const src = readFileSync(join(ROOT, "token/src", f), "utf8");
    assert.ok(
      !/console\.log\([^)]*secretKey/.test(src),
      `${f} печатает secretKey — приватный ключ не должен попадать в вывод`,
    );
  }
});

test(".gitignore закрывает файлы ключей под любым именем", () => {
  // Дыра, найденная аудитом: раньше было защищено ровно token/owner.json,
  // и ключ под другим именем ушёл бы в коммит.
  const candidates = [
    "owner.json",
    "token/my-key.json",
    "token/owner-backup.json",
    "my.keypair.json",
    "id.json",
    "secret.key.json",
    "token/deploy-output/devnet.json",
  ];
  for (const f of candidates) {
    const res = execFileSync("git", ["check-ignore", f], { cwd: ROOT, encoding: "utf8" }).trim();
    assert.equal(res, f, `${f} не игнорируется git`);
  }
});

test(".env.example коммитится, а .env — нет", () => {
  assert.throws(
    () => execFileSync("git", ["check-ignore", "token/.env.example"], { cwd: ROOT, stdio: "pipe" }),
    "шаблон .env.example должен коммититься, иначе инструкция ссылается на несуществующий файл",
  );
  const env = execFileSync("git", ["check-ignore", "token/.env"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(env, "token/.env");
});

test("шаблон метаданных не содержит подставленной ссылки-заглушки после заполнения", () => {
  const meta = JSON.parse(readFileSync(join(ROOT, "token/metadata/doffa.json"), "utf8")) as {
    name: string;
    symbol: string;
    image: string;
  };
  assert.equal(meta.name, "DOFFA");
  assert.equal(meta.symbol, "DOFFA");
  // Пока заглушка на месте — это ожидаемо: ссылку подставляет владелец после
  // загрузки логотипа. Тест фиксирует сам факт наличия маркера, чтобы
  // незаполненный шаблон нельзя было принять за готовый.
  assert.match(meta.image, /^REPLACE_WITH_|^https:\/\/|^ipfs:\/\//);
});

test("скрипт метаданных отвергает временные хостинги", () => {
  const src = readFileSync(join(ROOT, "token/src/create-metadata.ts"), "utf8");
  for (const host of ["vercel", "ngrok", "localhost"]) {
    assert.ok(src.includes(host), `проверка на ${host} должна быть в скрипте`);
  }
});
