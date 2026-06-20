// Шаг 7. Переключает сайт с devnet на mainnet после создания токена.
// Читает адрес минта из .doffa-mint.json и патчит app/solana.ts.
// Запускать ПОСЛЕ npm run create + npm run revoke.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MINT_FILE = ".doffa-mint.json";
const SOLANA_TS = join("..", "app", "solana.ts");

// Проверяем наличие файла с минтом
if (!existsSync(MINT_FILE)) {
  console.error(`⛔ Файл ${MINT_FILE} не найден. Сначала выполни: npm run create`);
  process.exit(1);
}

const { mint, cluster } = JSON.parse(readFileSync(MINT_FILE, "utf8")) as {
  mint: string;
  cluster: string;
};

if (cluster !== "mainnet-beta") {
  console.error(`⛔ Токен создан на ${cluster}, а не на mainnet-beta. Убедись, что .env: CLUSTER=mainnet-beta`);
  process.exit(1);
}

if (!existsSync(SOLANA_TS)) {
  console.error(`⛔ Файл ${SOLANA_TS} не найден. Запускай из директории token/.`);
  process.exit(1);
}

console.log(`Новый mainnet-адрес: ${mint}`);
console.log(`Патчу ${SOLANA_TS} ...`);

let src = readFileSync(SOLANA_TS, "utf8");

// Заменяем cluster
src = src.replace(
  /cluster:\s*"devnet"\s+as\s+const/,
  `cluster: "mainnet-beta" as const`
);

// Заменяем rpc
src = src.replace(
  /rpc:\s*"https:\/\/api\.devnet\.solana\.com"/,
  `rpc: "https://api.mainnet-beta.solana.com"`
);

// Заменяем mint (старый devnet или любой предыдущий адрес)
src = src.replace(
  /mint:\s*"[A-Za-z0-9]{32,44}"/,
  `mint: "${mint}"`
);

// Убираем комментарий про devnet из верхней части файла
src = src.replace(
  "// Лёгкая интеграция с Solana без тяжёлых библиотек:\n// читаем данные токена через публичный JSON-RPC и подключаем Phantom через\n// встроенный в браузер провайдер. Сейчас всё на devnet (тест-токен).",
  "// Лёгкая интеграция с Solana без тяжёлых библиотек:\n// читаем данные токена через публичный JSON-RPC и подключаем Phantom через\n// встроенный в браузер провайдер. Токен на mainnet-beta."
);

// Убираем комментарий "На mainnet заменим на боевой"
src = src.replace(
  "  // Адрес тест-минта $DOFFA на devnet. На mainnet заменим на боевой.\n  ",
  "  "
);

writeFileSync(SOLANA_TS, src, "utf8");

console.log("✅ app/solana.ts обновлён:");
console.log(`   cluster: "mainnet-beta"`);
console.log(`   rpc: "https://api.mainnet-beta.solana.com"`);
console.log(`   mint: "${mint}"`);
console.log("");
console.log("Следующие шаги:");
console.log("  1. git add app/solana.ts && git commit -m 'chore: switch to mainnet token'");
console.log("  2. git push → Vercel автоматически задеплоит");
console.log("  3. Добавь в Vercel env: CLOUDSHOP_API_KEY, CLOUDSHOP_ACCOUNT_ID, RECEIPT_HASH_SALT");
console.log("  4. Настрой вебхук CloudShop → https://doffa.coffee/api/webhook/pos");
