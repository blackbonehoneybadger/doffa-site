// Команда /shift — открыть или закрыть смену.
//   /shift open   — начать рабочий день
//   /shift close  — закрыть смену и показать итог
//   /shift        — показать статус текущей смены
import type { Context } from "telegraf";
import { getOpenShift, openShift, closeShift, shiftSummary } from "../db.js";
import { formatRub, formatTime } from "../format.js";

export async function handleShift(ctx: Context, arg: string): Promise<void> {
  const userId = ctx.from?.id;
  if (userId === undefined) return;

  const action = arg.trim().toLowerCase();
  const open = getOpenShift();

  // /shift open
  if (action === "open" || action === "открыть") {
    if (open) {
      await ctx.reply(`⚠️ Смена уже открыта (с ${formatTime(open.opened_at)}). Закрой её: /shift close`);
      return;
    }
    const shift = openShift(userId);
    await ctx.reply(`✅ Смена #${shift.id} открыта в ${formatTime(shift.opened_at)}.\nПробивай продажи: /sale 150 Капучино`);
    return;
  }

  // /shift close
  if (action === "close" || action === "закрыть") {
    if (!open) {
      await ctx.reply("⚠️ Нет открытой смены. Открой: /shift open");
      return;
    }
    const sum = shiftSummary(open.id);
    closeShift(open.id);
    await ctx.reply(
      `🔒 Смена #${open.id} закрыта.\n\n` +
        `Чеков: ${sum.count}\n` +
        `Чашек: ${sum.cups}\n` +
        `Выручка: ${formatRub(sum.cents)}`
    );
    return;
  }

  // /shift  (без аргумента) — статус
  if (!open) {
    await ctx.reply("Смена закрыта. Открой новую: /shift open");
  } else {
    const sum = shiftSummary(open.id);
    await ctx.reply(
      `🟢 Смена #${open.id} открыта с ${formatTime(open.opened_at)}.\n` +
        `Чеков: ${sum.count} · Чашек: ${sum.cups} · ${formatRub(sum.cents)}`
    );
  }
}
