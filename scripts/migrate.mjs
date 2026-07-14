// Разовая миграция схемы БД: node scripts/migrate.mjs
// Требует DATABASE_URL или POSTGRES_URL в окружении (см. .env.local).
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Задай DATABASE_URL или POSTGRES_URL перед запуском (см. .env.local / Vercel → Storage).");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf8");

const statements = schema
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const sql = neon(url);

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("OK:", stmt.replace(/\s+/g, " ").slice(0, 70) + "…");
}

console.log(`Готово — применено операторов: ${statements.length}.`);
