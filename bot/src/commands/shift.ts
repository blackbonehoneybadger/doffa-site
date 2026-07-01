// Команда /shift — открыть или закрыть смену.
//   /shift open   — начать рабочий день
//   /shift close  — закрыть смену и показать итог
//   /shift        — показать статус текущей смены
import type { Context } from "telegraf";
import { getOpenShift, openShift, closeShift, shiftSummary, pendingBurns } from "../db.js";
import { formatRub, formatTime } from "../format.js";

export async function handleShift(ctx: Context, arg: string): Promise<void> {
  const userId = ctx.from?.id;
  if (userId === undefined) return;

  const action = arg.trim().toLowerCase();
  const open = getOpenShift();

  // /shift open
  if (action === "open" || action === "открыть") {
    if (open) {
      await ctx.reply(`⚠️ Смена уже открыта (с ${formatTime(open.opened_at)}). Закрой её: /off`);
      return;
    }
    const shift = openShift(userId);
    await ctx.reply(`✅ Смена #${shift.id} открыта в ${formatTime(shift.opened_at)}.\nПробивай продажи: /menu`);
    return;
  }

  // /shift close
  if (action === "close" || action === "закрыть") {
    if (!open) {
      await ctx.reply("⚠️ Нет открытой смены. Открой: /go");
      return;
    }
    const sum = shiftSummary(open.id);
    const pending = pendingBurns(open.id);
    closeShift(open.id);
    const pendingLine = pending > 0
      ? `\n\n⚠️ ${pending} продаж не сожжено в блокчейне (burn упал). Проверь SOLANA_RPC и баланс кошелька.`
      : "";
    await ctx.reply(
      `🔒 Смена #${open.id} закрыта.\n\n` +
        `Чеков: ${sum.count}\n` +
        `Чашек: ${sum.cups}\n` +
        `Выручка: ${formatRub(sum.cents)}` +
        pendingLine
    );
    return;
  }

  // /shift  (без аргумента) — статус
  if (!open) {
    await ctx.reply("Смена закрыта. Открой новую: /go");
  } else {
    const sum = shiftSummary(open.id);
    await ctx.reply(
      `🟢 Смена #${open.id} открыта с ${formatTime(open.opened_at)}.\n` +
        `Чеков: ${sum.count} · Чашек: ${sum.cups} · ${formatRub(sum.cents)}`
    );
  }
}
