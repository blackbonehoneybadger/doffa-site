// npm run token:backup-sheet — сделать печатный лист резервной копии ключа.
//
// 🔒 ЗАПУСКАТЬ ТОЛЬКО НА СВОЁМ КОМПЬЮТЕРЕ. Никогда — в CI, в облачной сессии,
//    на чужой или рабочей машине.
//
// Что делает: берёт ключ из локального файла (или создаёт новый) и пишет
// рядом HTML-страницу, готовую к печати. Дальше ты открываешь её в браузере
// и печатаешь — на бумагу или в PDF.
//
// Чего НЕ делает: не выходит в сеть вообще. Ни одного запроса, ни одной
// зависимости от внешних сервисов. Ключ не покидает твой диск.
//
// ⚠️ ПОЧЕМУ PDF СЛАБЕЕ БУМАГИ
//
//    «Документы», «Рабочий стол» и «Загрузки» по умолчанию синхронизируются
//    в iCloud / OneDrive / Google Drive. PDF с ключом, сохранённый туда,
//    оказывается в облаке — просто не в том, о котором ты думал. Дальше он
//    попадает в резервные копии, в поиск по содержимому файлов и в снимки
//    диска. Удалить его потом отовсюду уже нельзя.
//
//    Бумага такого не умеет. Если всё же нужен PDF — сохраняй его на
//    несинхронизируемый носитель (флешка, зашифрованный том) и не оставляй
//    копию на рабочем диске.

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { Keypair } from "@solana/web3.js";

/** Кодирование в base58 без внешних зависимостей. */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (const b of bytes) {
    if (b === 0) out += "1";
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}

/** Разбивает длинную строку на группы — так её реально сверить глазами. */
function grouped(s: string, size = 4, perLine = 8): string[] {
  const groups: string[] = [];
  for (let i = 0; i < s.length; i += size) groups.push(s.slice(i, i + size));
  const lines: string[] = [];
  for (let i = 0; i < groups.length; i += perLine) {
    lines.push(groups.slice(i, i + perLine).join(" "));
  }
  return lines;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function main(): void {
  const arg = process.argv[2]?.trim();
  const keyPath = resolve(arg || "./owner.json");

  let kp: Keypair;
  let created = false;

  if (existsSync(keyPath)) {
    const raw = JSON.parse(readFileSync(keyPath, "utf8")) as unknown;
    if (!Array.isArray(raw) || raw.length !== 64) {
      throw new Error(`⛔ ${keyPath} не похож на ключ Solana (нужен массив из 64 чисел).`);
    }
    kp = Keypair.fromSecretKey(Uint8Array.from(raw as number[]));
  } else {
    // Нового ключа без явного согласия не создаём: молча сгенерировать ключ
    // и записать на диск — способ незаметно завести кошелёк, о котором
    // владелец не знает.
    if (process.argv[3] !== "--create") {
      throw new Error(
        `Файл ключа не найден: ${keyPath}\n\n` +
          "  Если нужен НОВЫЙ кошелёк, добавь флаг --create:\n" +
          `     npm run token:backup-sheet -- ${arg || "./owner.json"} --create\n\n` +
          "  Если ключ уже есть — укажи путь к нему первым аргументом.\n" +
          "  Экспорт из Phantom заносится командой npm run token:import.",
      );
    }
    kp = Keypair.generate();
    writeFileSync(keyPath, JSON.stringify(Array.from(kp.secretKey)));
    created = true;
  }

  const address = kp.publicKey.toBase58();
  const secretB58 = base58Encode(kp.secretKey);
  // Контрольная сумма — чтобы после переписывания от руки убедиться, что
  // ни один символ не потерян. Считается от секрета, но сам секрет не
  // раскрывает: обратно из хеша ключ не восстановить.
  const checksum = createHash("sha256").update(kp.secretKey).digest("hex").slice(0, 8).toUpperCase();

  const outPath = join(dirname(keyPath), "doffa-key-backup.html");
  const date = new Date().toISOString().slice(0, 10);

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>DOFFA — резервная копия ключа</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111;
         font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2mm; }
  .sub { color: #666; margin-bottom: 8mm; font-size: 10pt; }
  .warn { border: 2px solid #b00; background: #fff5f5; padding: 4mm 5mm;
          border-radius: 2mm; margin-bottom: 7mm; }
  .warn b { color: #b00; }
  .box { border: 1.5px solid #333; border-radius: 2mm; padding: 4mm 5mm; margin-bottom: 6mm; }
  .lbl { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1pt;
         color: #666; margin-bottom: 2mm; font-weight: bold; }
  .mono { font-family: "DejaVu Sans Mono", "Courier New", monospace; font-size: 11pt;
          line-height: 1.9; word-break: break-all; }
  .secret .mono { font-size: 12pt; letter-spacing: 0.4pt; }
  .meta { display: flex; gap: 10mm; font-size: 9pt; color: #555; margin-bottom: 6mm; }
  ol { padding-left: 5mm; } li { margin-bottom: 1.5mm; }
  .foot { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #ccc;
          font-size: 8.5pt; color: #777; }
  @media screen { body { max-width: 190mm; margin: 10mm auto; padding: 0 6mm; } }
</style></head><body>

<h1>DOFFA — резервная копия ключа</h1>
<div class="sub">Кошелёк владельца проекта · лист создан ${date}</div>

<div class="warn">
  <b>Кто держит этот лист — держит кошелёк.</b> Никому его не показывай: ни
  разработчику, ни поддержке, ни ассистенту. Настоящая поддержка никогда не
  просит приватный ключ. Не фотографируй, не отправляй в мессенджер, не
  загружай в облако.
</div>

<div class="box">
  <div class="lbl">Публичный адрес — его можно показывать кому угодно</div>
  <div class="mono">${esc(address)}</div>
</div>

<div class="box secret">
  <div class="lbl">Приватный ключ (base58) — только для твоих глаз</div>
  <div class="mono">${grouped(secretB58).map(esc).join("<br>")}</div>
</div>

<div class="meta">
  <div><b>Контрольная сумма:</b> ${checksum}</div>
  <div><b>Сеть:</b> Solana mainnet-beta</div>
</div>

<div class="box">
  <div class="lbl">Что сделать прямо сейчас</div>
  <ol>
    <li>Напечатай этот лист на бумаге. Убери туда, где хранят документы, а не рядом с компьютером.</li>
    <li>Сделай второй экземпляр и держи его в другом месте: пожар и кража забирают всё, что лежит в одной точке.</li>
    <li><b>Проверь копию восстановлением.</b> Удали кошелёк из приложения и подними обратно из этой копии. Пока не проверил — считай, что копии нет.</li>
    <li>Удали HTML-файл с диска и очисти корзину. Если печатал в PDF — не оставляй его в синхронизируемой папке.</li>
  </ol>
</div>

<div class="foot">
  Контрольная сумма — первые 8 символов SHA-256 от ключа. По ней можно
  убедиться, что при переписывании ничего не потеряно; восстановить ключ из
  неё нельзя. Проект уже терял 1 000 000 DOFFA из-за отсутствия проверенной
  резервной копии — пункт 3 списка выше написан именно поэтому.
</div>

</body></html>`;

  writeFileSync(outPath, html, "utf8");

  const bar = "─".repeat(66);
  console.log(`\n${bar}`);
  console.log(created ? "  СОЗДАН НОВЫЙ КЛЮЧ + печатный лист" : "  ПЕЧАТНЫЙ ЛИСТ для существующего ключа");
  console.log(bar);
  console.log(`  Публичный адрес   ${address}`);
  console.log(`  Контрольная сумма ${checksum}`);
  console.log(`  Файл ключа        ${keyPath}`);
  console.log(`  Лист для печати   ${outPath}`);
  console.log(`${bar}\n`);
  console.log("🔒 Приватный ключ намеренно не выведен в консоль — он только в файлах.\n");
  console.log("Дальше:");
  console.log(`  1. Открой в браузере: file://${outPath}`);
  console.log("  2. Ctrl/Cmd + P → печать на бумагу (надёжнее) или «Сохранить как PDF»");
  console.log("  3. Проверь копию восстановлением: удали кошелёк и подними из неё");
  console.log("  4. Удали HTML с диска и очисти корзину\n");
  console.log("⚠️  PDF на компьютере слабее бумаги: «Документы» и «Рабочий стол» обычно");
  console.log("    синхронизируются в облако. Если нужен PDF — держи его на флешке.\n");
}

try {
  main();
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
