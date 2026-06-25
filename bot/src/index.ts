// DOFFA POS — точка входа Telegram-бота.
// Запуск: npm run dev (или npm start)
import { Telegraf, Markup, type Context } from "telegraf";
import { CONFIG, isAdmin } from "./config.js";
import { getOpenShift, getLastSale, deleteSale } from "./db.js";
import { handleShift } from "./commands/shift.js";
import { handleSale } from "./commands/sale.js";
import { handleStats } from "./commands/stats.js";
import { handleMenuCommand, handleMenuCallback } from "./commands/menuCmd.js";

const bot = new Telegraf(CONFIG.botToken);

// Постоянная клавиатура внизу — всегда подсказывает что делать.
const KB = Markup.keyboard([
  ["☕ Пробить продажу"],
  ["🔔 Открыть смену", "🔒 Закрыть смену"],
  ["📊 Итог смены", "↩️ Отменить"],
]).resize();

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
      "Пользуйся кнопками внизу 👇 или командами:\n\n" +
      "🔔 /go — открыть смену\n" +
      "☕ /menu — выбрать напиток из меню\n" +
      "✍️ /sale 150 Капучино — пробить вручную\n" +
      "📊 /stats — итог смены\n" +
      "↩️ /cancel — отменить последнюю продажу\n" +
      "🔒 /off — закрыть смену\n" +
      "❓ /help — подсказка",
    KB,
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "Как пользоваться:\n\n" +
      "1) Утром: /go\n" +
      "2) Продажа через меню: /menu 🎯\n" +
      "   Или вручную: /sale 150 Капучино\n" +
      "   Несколько чашек: /sale 300 x2 Латте\n" +
      "3) Проверить итог: /stats\n" +
      "4) Ошиблись: /cancel\n" +
      "5) Вечером: /off"
  );
});

bot.command("shift", (ctx) => handleShift(ctx, args(ctx.message.text)));
bot.command("go", (ctx) => handleShift(ctx, "open"));
bot.command("off", (ctx) => handleShift(ctx, "close"));
bot.command("sale", (ctx) => handleSale(ctx, args(ctx.message.text)));
bot.command("stats", (ctx) => handleStats(ctx));
bot.command("menu", (ctx) => handleMenuCommand(ctx));
bot.on("callback_query", (ctx) => handleMenuCallback(ctx));

// --- Кнопки нижней клавиатуры → те же действия, что и команды ---
bot.hears("🔔 Открыть смену", (ctx) => handleShift(ctx, "open"));
bot.hears("🔒 Закрыть смену", (ctx) => handleShift(ctx, "close"));
bot.hears("☕ Пробить продажу", (ctx) => handleMenuCommand(ctx));
bot.hears("📊 Итог смены", (ctx) => handleStats(ctx));
bot.hears("↩️ Отменить", (ctx) => cancelLastSale(ctx));

// Отмена последней продажи текущей смены — общая функция для /cancel и кнопки.
async function cancelLastSale(ctx: Context): Promise<void> {
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
  // Если токены уже сожжены в блокчейне — отмена запрещена.
  // Burn необратим, а удаление чека сломало бы сверку смены с Solana.
  if (last.burned) {
    await ctx.reply(
      `⛔ Продажу #${last.id} нельзя отменить — $DOFFA уже сожжены в блокчейне.\n` +
        `Сжигание необратимо, удаление чека сломало бы сверку смены.\n` +
        (last.tx_hash ? `TX: https://solscan.io/tx/${last.tx_hash}\n` : "") +
        `Если это ошибка — оформи возврат отдельной продажей.`,
    );
    return;
  }
  deleteSale(last.id);
  await ctx.reply(`↩️ Продажа #${last.id} отменена.`);
}

bot.command("cancel", (ctx) => cancelLastSale(ctx));

// --- Запуск ---
// Видно в логах Railway сразу при старте контейнера — даже до подключения к Telegram.
console.log(
  `🚀 DOFFA POS стартует… Node ${process.version}. ` +
    `Админов: ${CONFIG.adminIds.length}. База: ${CONFIG.dbPath}. ` +
    `Mint: ${CONFIG.mint.slice(0, 6)}…`,
);

bot
  .launch(async () => {
    // Меню команд Telegram — появляется по кнопке «меню» и при вводе «/».
    try {
      await bot.telegram.setMyCommands([
        { command: "menu", description: "☕ Пробить продажу из меню" },
        { command: "go", description: "🔔 Открыть смену" },
        { command: "off", description: "🔒 Закрыть смену" },
        { command: "stats", description: "📊 Итог смены" },
        { command: "cancel", description: "↩️ Отменить последнюю продажу" },
        { command: "help", description: "❓ Подсказка" },
      ]);
    } catch (err) {
      console.error("setMyCommands error:", err);
    }
    console.log(`✅ DOFFA POS бот запущен и слушает Telegram. Админов: ${CONFIG.adminIds.length}.`);
  })
  .catch((err) => {
    // Если Telegram отверг токен или сеть недоступна — видно в логах, контейнер перезапустится.
    console.error("⛔ Не удалось запустить бота:", err instanceof Error ? err.message : err);
    process.exit(1);
  });

// Чтобы любой необработанный сбой был виден в логах, а не «тихо молчал».
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
