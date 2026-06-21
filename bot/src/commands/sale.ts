// Команда /sale — пробить продажу.
//   /sale 150            — продажа на 150 ₽, 1 чашка
//   /sale 150 Капучино   — то же, с заметкой
//   /sale 300 x2 Латте   — 300 ₽, 2 чашки, заметка "Латте"
//
// Каждая чашка = BURN_PER_CUP токенов $DOFFA к сжиганию.
import type { Context } from "telegraf";
import { getOpenShift, addSale } from "../db.js";
import { CONFIG } from "../config.js";
import { formatRub } from "../format.js";

export async function handleSale(ctx: Context, arg: string): Promise<void> {
  const userId = ctx.from?.id;
  if (userId === undefined) return;

  const open = getOpenShift();
  if (!open) {
    await ctx.reply("⚠️ Сначала открой смену: /shift open");
    return;
  }

  const parts = arg.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    await ctx.reply("Как пробить: /sale 150 Капучино\nИли несколько чашек: /sale 300 x2 Латте");
    return;
  }

  // Первый аргумент — сумма в рублях
  const rub = Number(parts[0].replace(",", "."));
  if (!Number.isFinite(rub) || rub <= 0) {
    await ctx.reply(`Не понял сумму "${parts[0]}". Пример: /sale 150 Капучино`);
    return;
  }

  // Необязательный множитель чашек: x2 / х2 / 2x
  let cups = 1;
  let rest = parts.slice(1);
  if (rest.length > 0) {
    const m = rest[0].match(/^[xх](\d+)$|^(\d+)[xх]$/i);
    if (m) {
      cups = Number(m[1] ?? m[2]);
      rest = rest.slice(1);
    }
  }
  if (!Number.isFinite(cups) || cups < 1) cups = 1;

  const note = rest.join(" ") || null;
  const amountCents = Math.round(rub * 100);

  const sale = addSale({ shiftId: open.id, userId, amountCents, cups, note });
  const toBurn = cups * CONFIG.burnPerCup;

  await ctx.reply(
    `☕ Продажа #${sale.id} записана\n` +
      `Сумма: ${formatRub(amountCents)}\n` +
      `Чашек: ${cups}` +
      (note ? `\nЗаметка: ${note}` : "") +
      `\n\n🔥 К сжиганию: ${toBurn} $DOFFA` +
      `\nОтпечаток чека: ${sale.receipt_hash}` +
      `\n\nОшиблись? Отменить последний: /cancel`
  );
}
