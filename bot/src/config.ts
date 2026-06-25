// Читаем настройки из .env и проверяем, что всё на месте.
// Если чего-то не хватает — бот не запустится и честно скажет, что добавить.
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`⛔ Не задана переменная ${name}. Скопируй .env.example в .env и заполни.`);
    process.exit(1);
  }
  return value;
}

// Список Telegram-ID админов: "123,456" → [123, 456]
function parseAdminIds(raw: string): number[] {
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    console.error("⛔ ADMIN_IDS пуст или некорректен. Укажи хотя бы один Telegram-ID.");
    process.exit(1);
  }
  return ids;
}

export const CONFIG = {
  botToken: required("DOFFA_BOT_TOKEN"),
  adminIds: parseAdminIds(required("ADMIN_IDS")),
  dbPath: process.env.DB_PATH?.trim() || "./data/doffa.db",
  // По умолчанию — devnet тест-токен (бесплатно). На mainnet зададим DOFFA_MINT.
  mint: process.env.DOFFA_MINT?.trim() || "FVERje4sz25gD1w4hTYV5VevSLPPDFhoNDHax1gvMVKU",
  // Целое ≥1: дробное значение сломало бы BigInt() при расчёте суммы сжигания.
  burnPerCup: Math.max(1, Math.round(Number(process.env.BURN_PER_CUP ?? "1") || 1)),
};

export function isAdmin(userId: number | undefined): boolean {
  return userId !== undefined && CONFIG.adminIds.includes(userId);
}
