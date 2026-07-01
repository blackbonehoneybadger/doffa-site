// Команда /stats — показать итог текущей (или последней) смены.
import type { Context } from "telegraf";
import { getOpenShift, shiftSummary, pendingBurns } from "../db.js";
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
  const pending = pendingBurns(open.id);
  const pendingLine = pending > 0
    ? `\n⚠️ Несожжённых: ${pending} (burn не прошёл, токены ещё не сожжены)`
    : "";
  await ctx.reply(
    `📊 Смена #${open.id} (с ${formatTime(open.opened_at)})\n\n` +
      `Чеков: ${sum.count}\n` +
      `Чашек: ${sum.cups}\n` +
      `Выручка: ${formatRub(sum.cents)}\n` +
      `🔥 К сжиганию за смену: ${toBurn} $DOFFA` +
      pendingLine
  );
}
