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
import { execFileSync } from "node:child_process";
import { Keypair } from "@solana/web3.js";

// Известные адреса проекта — чтобы сразу подписать, что нашлось.
const KNOWN: Record<string, string> = {
  J3Gtgug3j2qdcTTYHWmjfVDuyFr9y6BANueQUjmofWD3: "ключ, которым выпускался токен (owner.json)",
  "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS": "казна проекта — 99 000 000 $DOFFA",
  Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV:
    "утерянный кошелёк — 1 000 000 $DOFFA, ключ признан утраченным 2026-07-29",
  // Новый фонд наград. Живёт в Phantom («Аккаунт 4»), то есть выводится из
  // seed-фразы, а не из отдельного файла-ключа. Поэтому find-key его в файлах
  // НЕ найдёт — и это нормально, а не повод считать ключ потерянным.
  HgkpyFLHevAHVdvmp2bvZ9L8rvxZyzDrSKqc4357Z6EP:
    "★ НОВЫЙ ФОНД НАГРАД — Phantom «Аккаунт 4», ключ из seed-фразы",
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

// --- Поиск в git-истории --------------------------------------------------
// Ключ мог быть закоммичен и потом удалён — в рабочей папке его уже нет, но в
// истории репозитория он остаётся. Читаем blob-объекты В ПАМЯТИ, определяем
// публичный адрес и НИЧЕГО не восстанавливаем на диск. Приватные ключи не
// печатаются.
type GitFound = { address: string; ref: string };

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function scanGitHistory(cwd: string): GitFound[] {
  const out: GitFound[] = [];
  try {
    git(["rev-parse", "--git-dir"], cwd); // не git-репозиторий → тихо выходим
  } catch {
    return out;
  }

  let objects: string;
  try {
    objects = git(["rev-list", "--objects", "--all"], cwd);
  } catch {
    return out;
  }

  const gitSeen = new Set<string>();
  for (const line of objects.split("\n")) {
    const sp = line.indexOf(" ");
    if (sp < 0) continue;
    const sha = line.slice(0, sp);
    const path = line.slice(sp + 1);
    // Смотрим только на похожие на ключ имена, чтобы не перебирать весь код.
    if (!/\.(json)$/i.test(path)) continue;
    if (/package(-lock)?\.json$|tsconfig|manifest|\.vscode/i.test(path)) continue;
    if (gitSeen.has(sha)) continue;
    gitSeen.add(sha);

    try {
      if (git(["cat-file", "-t", sha], cwd).trim() !== "blob") continue;
      const body = git(["cat-file", "-p", sha], cwd);
      if (body.length > 4096) continue;
      const raw = JSON.parse(body) as unknown;
      if (!Array.isArray(raw) || raw.length !== 64) continue;
      if (!raw.every((n) => typeof n === "number" && n >= 0 && n <= 255)) continue;
      const address = Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey.toBase58();
      out.push({ address, ref: `${path} (в истории git, коммит-объект ${sha.slice(0, 10)})` });
    } catch {
      // не blob, не JSON, не keypair — пропускаем
    }
  }
  return out;
}

const gitFound: GitFound[] = [];
for (const root of roots) {
  for (const g of scanGitHistory(root)) {
    if (!gitFound.some((x) => x.address === g.address && x.ref === g.ref)) gitFound.push(g);
  }
}

if (unique.length === 0) {
  console.log("Файлов-ключей в папках не найдено.");
  console.log("Попробуй указать папку явно:  npm run find-key -- путь/к/папке\n");
} else {
  console.log("=== Ключи-файлы ===");
  for (const f of unique) {
    const label = KNOWN[f.address];
    console.log(label ? `✅ ${f.address}\n   ${label}\n   файл: ${f.file}\n`
                      : `•  ${f.address}\n   (кошелёк проекту неизвестен)\n   файл: ${f.file}\n`);
  }
}

if (gitFound.length > 0) {
  console.log("=== Ключи в git-истории (удалённые/старые файлы) ===");
  for (const g of gitFound) {
    const label = KNOWN[g.address];
    console.log(label ? `✅ ${g.address}\n   ${label}\n   ${g.ref}\n`
                      : `•  ${g.address}\n   (кошелёк проекту неизвестен)\n   ${g.ref}\n`);
  }
}

// Утерянный кошелёк на 1 000 000 $DOFFA. Поиск по нему закрыт 2026-07-29:
// проверены файлы, история git, все аккаунты Phantom и переменные Railway —
// ключа нет нигде. Проверку оставляем на случай, если ключ всплывёт сам
// (старый диск, забытая флешка), но заново искать его не нужно.
const lost = "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV";
const lostFound =
  unique.some((f) => f.address === lost) || gitFound.some((g) => g.address === lost);
if (lostFound) {
  console.log(
    "\n🎉 НЕОЖИДАННО: ключ от утерянного кошелька Hk6X6qb… НАЙДЕН — путь указан выше.\n" +
      "   Его считали утраченным. Никому его не отправляй и сообщи мне: это возвращает\n" +
      "   проекту 1 000 000 $DOFFA.",
  );
} else {
  console.log(
    "\nℹ️  Ключ от кошелька Hk6X6qb… (1 000 000 $DOFFA) не найден — как и ожидалось.\n" +
      "   Он признан утраченным 2026-07-29, проект работает с 99 000 000. Искать его\n" +
      "   заново не нужно: подробности в docs/LOST_REWARD_VAULT.md.",
  );
}
