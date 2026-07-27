// Шаг 8. Найти, от каких кошельков у тебя есть ключи.
//
// Зачем: ключи $DOFFA лежат в разных местах — один создан командой keygen
// (файл owner.json), другой в Phantom. Легко забыть, где какой. Этот скрипт
// сам обходит папки, находит файлы-ключи и печатает, какому адресу каждый
// соответствует.
//
// 🔒 БЕЗОПАСНОСТЬ: скрипт печатает ТОЛЬКО публичные адреса. Приватные ключи
//    он не показывает, никуда не отправляет и не изменяет. Он вообще ничего
//    не пишет на диск — только читает.
//
// Запуск:
//   npm run find-key              — искать в папке token и в домашней папке
//   npm run find-key -- C:\путь   — искать в конкретной папке

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Keypair } from "@solana/web3.js";

// Известные адреса проекта — чтобы сразу подписать, что нашлось.
const KNOWN: Record<string, string> = {
  J3Gtgug3j2qdcTTYHWmjfVDuyFr9y6BANueQUjmofWD3: "ключ, которым выпускался токен (owner.json)",
  "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS": "казна проекта — 99 000 000 $DOFFA",
  Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV: "★ ФОНД НАГРАД — 1 000 000 $DOFFA",
};

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".cache", "Library", "AppData",
  "Applications", "Windows", "Program Files", "Program Files (x86)",
]);

/** Файл — это keypair Solana? Возвращает публичный адрес или null. */
function addressOf(file: string): string | null {
  try {
    // Ключ Solana — это JSON-массив из 64 чисел. Файлы больше 4 КБ точно не он.
    if (statSync(file).size > 4096) return null;
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(raw) || raw.length !== 64) return null;
    if (!raw.every((n) => typeof n === "number" && n >= 0 && n <= 255)) return null;
    return Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey.toBase58();
  } catch {
    // Не JSON, не массив, нет прав на чтение — просто не наш файл.
    return null;
  }
}

type Found = { file: string; address: string };

function scan(dir: string, depth: number, out: Found[]): void {
  if (depth < 0) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // нет прав — пропускаем молча
  }
  for (const name of entries) {
    if (name.startsWith(".") && name !== ".config" && name !== ".solana") continue;
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) {
      scan(full, depth - 1, out);
    } else if (name.endsWith(".json")) {
      const address = addressOf(full);
      if (address) out.push({ file: full, address });
    }
  }
}

const argDir = process.argv[2]?.trim();
const roots = argDir
  ? [resolve(argDir)]
  : [resolve("."), join(homedir(), "Desktop"), join(homedir(), "Downloads"),
     join(homedir(), "Documents"), homedir()];

console.log("Ищу файлы-ключи Solana. Приватные ключи НЕ печатаются.\n");

const found: Found[] = [];
const seen = new Set<string>();
for (const root of roots) {
  scan(root, root === homedir() ? 2 : 4, found);
}

const unique = found.filter((f) => {
  const key = `${f.address}|${f.file}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

if (unique.length === 0) {
  console.log("Файлов-ключей не найдено в проверенных папках.");
  console.log("Попробуй указать папку явно:  npm run find-key -- путь/к/папке");
} else {
  for (const f of unique) {
    const label = KNOWN[f.address];
    console.log(label ? `✅ ${f.address}\n   ${label}\n   файл: ${f.file}\n`
                      : `•  ${f.address}\n   (кошелёк проекту неизвестен)\n   файл: ${f.file}\n`);
  }
}

const vault = "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV";
console.log(
  unique.some((f) => f.address === vault)
    ? "\n🎉 Ключ от фонда наград НАЙДЕН — путь к файлу указан выше. Никому его не отправляй."
    : "\n❌ Ключа от фонда наград (Hk6X6qb…) среди файлов нет. Проверь ещё аккаунты в Phantom.",
);
