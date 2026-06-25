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
db.pragma("journal_mode = WAL"); // безопаснее при сбоях

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

export function deleteSale(saleId: number): void {
  db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
}

export function markAsBurned(saleId: number, txHash: string): void {
  db.prepare("UPDATE sales SET burned = 1, tx_hash = ? WHERE id = ?").run(txHash, saleId);
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
