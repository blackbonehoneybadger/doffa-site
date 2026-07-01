// Локальная база данных (SQLite). Хранит смены и продажи.
// Файл создаётся автоматически при первом запуске.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { CONFIG } from "./config.js";

// Создаём папку для базы, если её ещё нет
mkdirSync(dirname(CONFIG.dbPath), { recursive: true });

const db = new Database(CONFIG.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Таблица смен: одна открытая смена за раз.
db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_by  INTEGER NOT NULL,
    opened_at  INTEGER NOT NULL,
    closed_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS sales (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id     INTEGER NOT NULL,
    sold_by      INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    cups         INTEGER NOT NULL,
    note         TEXT,
    receipt_hash TEXT NOT NULL,
    burned       INTEGER NOT NULL DEFAULT 0,
    tx_hash      TEXT,
    created_at   INTEGER NOT NULL,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sales_shift  ON sales(shift_id);
  CREATE INDEX IF NOT EXISTS idx_sales_pending ON sales(shift_id, burned);
`);

// Миграция: добавить tx_hash для старых БД без этой колонки
const cols = (db.prepare("PRAGMA table_info(sales)").all() as { name: string }[]).map(c => c.name);
if (!cols.includes("tx_hash")) {
  db.exec("ALTER TABLE sales ADD COLUMN tx_hash TEXT");
}

export type Shift = {
  id: number;
  opened_by: number;
  opened_at: number;
  closed_at: number | null;
};

export type Sale = {
  id: number;
  shift_id: number;
  sold_by: number;
  amount_cents: number;
  cups: number;
  note: string | null;
  receipt_hash: string;
  burned: number;
  tx_hash: string | null;
  created_at: number;
};

// --- Смены ---

export function getOpenShift(): Shift | undefined {
  return db.prepare("SELECT * FROM shifts WHERE closed_at IS NULL ORDER BY id DESC LIMIT 1").get() as
    | Shift
    | undefined;
}

export function openShift(userId: number): Shift {
  const info = db
    .prepare("INSERT INTO shifts (opened_by, opened_at) VALUES (?, ?)")
    .run(userId, Date.now());
  return db.prepare("SELECT * FROM shifts WHERE id = ?").get(info.lastInsertRowid) as Shift;
}

export function closeShift(shiftId: number): void {
  db.prepare("UPDATE shifts SET closed_at = ? WHERE id = ?").run(Date.now(), shiftId);
}

// --- Продажи ---

// Анонимный отпечаток чека: SHA-256(данные продажи). Без личных данных покупателя.
function makeReceiptHash(shiftId: number, amountCents: number, ts: number): string {
  return createHash("sha256")
    .update(`${shiftId}|${amountCents}|${ts}|${CONFIG.mint}`)
    .digest("hex")
    .slice(0, 16);
}

export function addSale(args: {
  shiftId: number;
  userId: number;
  amountCents: number;
  cups: number;
  note: string | null;
}): Sale {
  const ts = Date.now();
  const receiptHash = makeReceiptHash(args.shiftId, args.amountCents, ts);
  const info = db
    .prepare(
      `INSERT INTO sales (shift_id, sold_by, amount_cents, cups, note, receipt_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(args.shiftId, args.userId, args.amountCents, args.cups, args.note, receiptHash, ts);
  return db.prepare("SELECT * FROM sales WHERE id = ?").get(info.lastInsertRowid) as Sale;
}

export function getLastSale(shiftId: number): Sale | undefined {
  return db
    .prepare("SELECT * FROM sales WHERE shift_id = ? ORDER BY id DESC LIMIT 1")
    .get(shiftId) as Sale | undefined;
}

export function getSaleById(saleId: number): Sale | undefined {
  return db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId) as Sale | undefined;
}

export function deleteSale(saleId: number): void {
  db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
}

/**
 * Идемпотентная пометка о сжигании: помечает ТОЛЬКО если продажа ещё не сожжена
 * (WHERE burned = 0). Возвращает число изменённых строк:
 *   1 — пометили; 0 — продажа уже сожжена ИЛИ удалена (двойной burn / гонка).
 * Вызывающий обязан проверить результат и не считать 0 успехом.
 */
export function markAsBurned(saleId: number, txHash: string): number {
  const info = db
    .prepare("UPDATE sales SET burned = 1, tx_hash = ? WHERE id = ? AND burned = 0")
    .run(txHash, saleId);
  return info.changes;
}

// Число продаж с неуспешным burn (burned=0) в смене.
export function pendingBurns(shiftId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS cnt FROM sales WHERE shift_id = ? AND burned = 0")
    .get(shiftId) as { cnt: number };
  return row.cnt;
}

// Сводка по смене: сколько чеков, чашек, денег.
export function shiftSummary(shiftId: number): { count: number; cups: number; cents: number } {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(cups), 0) AS cups,
              COALESCE(SUM(amount_cents), 0) AS cents
       FROM sales WHERE shift_id = ?`
    )
    .get(shiftId) as { count: number; cups: number; cents: number };
  return row;
}

export default db;
