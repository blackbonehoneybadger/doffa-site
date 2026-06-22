// DOFFA POS — точка входа Telegram-бота.
// Запуск: npm run dev (или npm start)
import { Telegraf } from "telegraf";
import { CONFIG, isAdmin } from "./config.js";
import { getOpenShift, getLastSale, deleteSale } from "./db.js";
import { handleShift } from "./commands/shift.js";
import { handleSale } from "./commands/sale.js";
import { handleStats } from "./commands/stats.js";
import { handleMenuCommand, handleMenuCallback } from "./commands/menuCmd.js";

const bot = new Telegraf(CONFIG.botToken);

// --- Защита: бот отвечает только администраторам ---
bot.use(async (ctx, next) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.reply("⛔ Доступ только для бариста DOFFA. Твой ID не в списке.");
    return;
  }
  return next();
});

// Достаём текст после команды: "/sale 150 Латте" → "150 Латте"
function args(text: string | undefined): string {
  if (!text) return "";
  const space = text.indexOf(" ");
  return space === -1 ? "" : text.slice(space + 1);
}

// --- Команды ---

bot.start(async (ctx) => {
  await ctx.reply(
    "👋 DOFFA POS — касса бариста.\n\n" +
      "Команды:\n" +
      "/shift open — открыть смену\n" +
      "/menu — выбрать напиток из меню 🎯\n" +
      "/sale 150 Капучино — пробить вручную\n" +
      "/stats — итог смены\n" +
      "/cancel — отменить последнюю продажу\n" +
      "/shift close — закрыть смену\n" +
      "/help — подсказка"
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "Как пользоваться:\n\n" +
      "1) Утром: /shift open\n" +
      "2) Продажа через меню: /menu 🎯\n" +
      "   Или вручную: /sale 150 Капучино\n" +
      "   Несколько чашек: /sale 300 x2 Латте\n" +
      "3) Проверить итог: /stats\n" +
      "4) Ошиблись: /cancel\n" +
      "5) Вечером: /shift close"
  );
});

bot.command("shift", (ctx) => handleShift(ctx, args(ctx.message.text)));
bot.command("sale", (ctx) => handleSale(ctx, args(ctx.message.text)));
bot.command("stats", (ctx) => handleStats(ctx));
bot.command("menu", (ctx) => handleMenuCommand(ctx));
bot.on("callback_query", (ctx) => handleMenuCallback(ctx));

// /cancel — удалить последнюю продажу текущей смены
bot.command("cancel", async (ctx) => {
  const open = getOpenShift();
  if (!open) {
    await ctx.reply("Нет открытой смены.");
    return;
  }
  const last = getLastSale(open.id);
  if (!last) {
    await ctx.reply("В этой смене ещё нет продаж.");
    return;
  }
  deleteSale(last.id);
  await ctx.reply(`↩️ Продажа #${last.id} отменена.`);
});

// --- Запуск ---
bot.launch(() => {
  console.log(`✅ DOFFA POS бот запущен. Админов: ${CONFIG.adminIds.length}. База: ${CONFIG.dbPath}`);
});

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
