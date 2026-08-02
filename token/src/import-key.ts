// npm run token:import — загрузить СУЩЕСТВУЮЩИЙ ключ владельца в локальный файл.
//
// Нужен для mainnet: `token:keygen` создаёт новый тестовый ключ и работает
// только в devnet, а эмиссию в mainnet обязан подписывать сам владелец своим
// кошельком.
//
// 🔒 БЕЗОПАСНОСТЬ — прочти, прежде чем запускать:
//
//    • ЗАПУСКАТЬ ТОЛЬКО НА СВОЁМ КОМПЬЮТЕРЕ. Ни в CI, ни в облачной сессии,
//      ни на чужой машине.
//    • Ввод приватного ключа СКРЫТ — он не отображается и не попадает в
//      историю команд.
//    • Ключ записывается только в локальный файл, который закрыт .gitignore.
//    • Скрипт ничего никуда не отправляет: сети он не касается вообще.
//    • Никому не показывай ни ключ, ни этот файл — включая разработчиков и
//      ассистента. Ни один человек и ни один инструмент не должен просить его.
//
// Использование:
//   npm run token:import -- E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr
//
// Аргумент — ПУБЛИЧНЫЙ адрес. Он нужен, чтобы убедиться: введённый ключ
// действительно принадлежит тому кошельку, которым мы собираемся подписывать.
// Без этой сверки легко импортировать не тот ключ и обнаружить это уже после
// того, как эмиссия ушла не туда.

import { writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Keypair } from "@solana/web3.js";
import { CFG, fail } from "./config.js";

/** Декодер base58 без внешних зависимостей. */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const ch of str) {
    const v = B58.indexOf(ch);
    if (v === -1) throw new Error(`недопустимый символ base58: «${ch}»`);
    let carry = v;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let k = 0; k < str.length && str[k] === "1"; k++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

/** Читает строку из терминала, не отображая ввод. */
function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    // Подменяем вывод: символы ввода не печатаются вообще.
    const write = out.write.bind(out);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(prompt)) write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      write("\n");
      resolve(answer);
    });
  });
}

function parseSecret(input: string): Uint8Array {
  const s = input.trim();
  if (!s) throw new Error("Пустой ввод.");

  // Формат 1: JSON-массив из 64 чисел (Solana CLI, id.json).
  if (s.startsWith("[")) {
    const raw = JSON.parse(s) as unknown;
    if (!Array.isArray(raw) || raw.length !== 64) {
      throw new Error(`Массив должен содержать ровно 64 числа, получено ${Array.isArray(raw) ? raw.length : "не массив"}.`);
    }
    return Uint8Array.from(raw as number[]);
  }

  // Формат 2: base58 из Phantom (Настройки → Безопасность → Экспорт приватного ключа).
  const bytes = base58Decode(s);
  if (bytes.length !== 64) {
    throw new Error(
      `Из base58 получилось ${bytes.length} байт вместо 64.\n` +
        "   Похоже, это не приватный ключ. Из Phantom нужен именно «Private Key»,\n" +
        "   а не seed-фраза и не публичный адрес.",
    );
  }
  return bytes;
}

async function main(): Promise<void> {
  const expected = process.argv[2]?.trim();
  if (!expected) {
    throw new Error(
      "Укажи свой ПУБЛИЧНЫЙ адрес:\n" +
        "   npm run token:import -- E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr\n\n" +
        "   Он нужен для сверки: скрипт проверит, что введённый ключ\n" +
        "   действительно принадлежит этому кошельку.",
    );
  }

  if (existsSync(CFG.keypairPath)) {
    throw new Error(
      `⛔ Файл уже существует: ${CFG.keypairPath}\n` +
        "   Перезаписывать не буду — так теряют ключи. Удали его сам, если уверен.",
    );
  }

  console.log("\n🔒 Ввод скрыт. Ключ никуда не отправляется и остаётся только у тебя.\n");
  console.log("   Принимаются два формата:");
  console.log("     • base58 из Phantom (Настройки → Безопасность → Экспорт приватного ключа)");
  console.log("     • JSON-массив из 64 чисел (Solana CLI)\n");

  const input = await askHidden("Приватный ключ: ");
  const secret = parseSecret(input);
  const kp = Keypair.fromSecretKey(secret);
  const actual = kp.publicKey.toBase58();

  // Главная проверка: тот ли это кошелёк.
  if (actual !== expected) {
    throw new Error(
      `⛔ КЛЮЧ НЕ ОТ ТОГО КОШЕЛЬКА.\n\n` +
        `   Ключ принадлежит: ${actual}\n` +
        `   Ожидался:         ${expected}\n\n` +
        "   Ничего не записано. Проверь, из какого аккаунта экспортировал ключ.",
    );
  }

  writeFileSync(CFG.keypairPath, JSON.stringify(Array.from(secret)));

  console.log("✅ Ключ импортирован и сверен с адресом.\n");
  console.log(`   Файл           : ${CFG.keypairPath} (в .gitignore)`);
  console.log(`   Публичный адрес: ${actual}`);
  console.log("\n🔒 Приватный ключ намеренно не выведен на экран.");
  console.log("\n⚠️  Прежде чем переводить сюда токены — проверь бэкап ВОССТАНОВЛЕНИЕМ:");
  console.log("   удали кошелёк из Phantom и подними обратно из сохранённой копии.");
  console.log("   Проект уже терял 1 000 000 DOFFA именно потому, что этого не сделали.");
  console.log("\nДальше: npm run token:check-wallet");
}

main().catch(fail);
