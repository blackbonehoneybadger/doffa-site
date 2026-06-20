// Шаг 0 (альтернатива keygen). Импортирует ТВОЙ существующий кошелёк в owner.json.
//
// ⚠️ ЗАПУСКАТЬ ТОЛЬКО НА СВОЁМ КОМПЬЮТЕРЕ. Приватный ключ никуда не отправляется —
//    он только локально записывается в owner.json. Никому его не показывай (и мне тоже).
//
// Использование:
//   npm run import -- 5pDGcYJCwfniTpE9q73hgsHonzUtzrF6biMxfrpLLZJD
//
// Аргумент — твой ПУБЛИЧНЫЙ адрес (для проверки, что ключ совпадает).
// Скрипт спросит приватный ключ (ввод скрыт). Поддерживает 2 формата:
//   1. base58-строка из Phantom (Настройки → Безопасность → Экспорт приватного ключа)
//   2. JSON-массив из 64 чисел (формат Solana CLI / owner.json)
import { writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Keypair } from "@solana/web3.js";
import { CFG } from "./config.js";

// Декодер base58 (без внешних зависимостей).
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const ch of str) {
    const value = B58_ALPHABET.indexOf(ch);
    if (value === -1) throw new Error("invalid base58 character");
    let carry = value;
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
  // Ведущие нули (символ '1') в base58
  for (let k = 0; k < str.length && str[k] === "1"; k++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

const path = CFG.keypairPath;
const expectedAddress = process.argv[2]?.trim();

if (!expectedAddress) {
  console.error("⛔ Укажи свой публичный адрес: npm run import -- <ТВОЙ_АДРЕС>");
  process.exit(1);
}

if (existsSync(path)) {
  console.error(`⛔ Файл ${path} уже существует. Удали его вручную, если правда хочешь заменить ключ.`);
  process.exit(1);
}

// Читаем приватный ключ из stdin со скрытым вводом (как пароль).
function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdout = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
    // Глушим эхо — символы ключа не печатаются в терминале.
    stdout._writeToOutput = function () {};
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

// Преобразует ввод (base58 или JSON-массив) в 64-байтный секретный ключ.
function parseSecret(input: string): Uint8Array {
  if (input.startsWith("[")) {
    const arr = JSON.parse(input) as number[];
    return Uint8Array.from(arr);
  }
  // base58 (Phantom)
  return base58Decode(input);
}

const secret = await askSecret("Вставь приватный ключ (ввод скрыт) и нажми Enter: ");

let kp: Keypair;
try {
  const bytes = parseSecret(secret);
  kp = Keypair.fromSecretKey(bytes);
} catch {
  console.error("⛔ Не удалось разобрать ключ. Проверь, что вставил его целиком (base58 из Phantom или JSON-массив).");
  process.exit(1);
}

const actual = kp.publicKey.toBase58();
if (actual !== expectedAddress) {
  console.error("⛔ Ключ НЕ совпадает с указанным адресом!");
  console.error(`   Ожидался: ${expectedAddress}`);
  console.error(`   Получен:  ${actual}`);
  console.error("   Ничего не записано. Проверь ключ и адрес.");
  process.exit(1);
}

writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));

console.log("✅ Кошелёк импортирован в", path);
console.log("   Публичный адрес:", actual);
console.log("\n🔒 owner.json содержит твой приватный ключ. Никому не показывай (мне тоже).");
console.log("   Дальше: пополни этот адрес SOL на mainnet и запусти npm run create.");
