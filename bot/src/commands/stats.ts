// Команда /stats — показать итог текущей (или последней) смены.
import type { Context } from "telegraf";
import { getOpenShift, shiftSummary } from "../db.js";
import { CONFIG } from "../config.js";
import { formatRub, formatTime } from "../format.js";

export async function handleStats(ctx: Context): Promise<void> {
  const open = getOpenShift();
  if (!open) {
    await ctx.reply("Нет открытой смены. Открой: /go");
    return;
  }
  const sum = shiftSummary(open.id);
  const toBurn = sum.cups * CONFIG.burnPerCup;
  await ctx.reply(
    `📊 Смена #${open.id} (с ${formatTime(open.opened_at)})\n\n` +
      `Чеков: ${sum.count}\n` +
      `Чашек: ${sum.cups}\n` +
      `Выручка: ${formatRub(sum.cents)}\n` +
      `🔥 К сжиганию за смену: ${toBurn} $DOFFA`
  );
}
