import { Markup, type Context } from "telegraf";
import type { CallbackQuery } from "telegraf/types";
import { MENU } from "../menu.js";
import { getOpenShift, addSale, markAsBurned } from "../db.js";
import { burnCoffee, isBurnConfigured } from "../burn.js";
import { CONFIG } from "../config.js";

export function categoryKeyboard() {
  return Markup.inlineKeyboard(
    MENU.map((cat) => Markup.button.callback(`${cat.emoji} ${cat.title}`, `m:cat:${cat.id}`)),
    { columns: 3 },
  );
}

function itemsKeyboard(catId: string) {
  const cat = MENU.find((c) => c.id === catId);
  if (!cat) return null;
  const rows = cat.items.map((item) =>
    item.sizes.map((size) =>
      Markup.button.callback(`${item.name} ${size.label}`, `m:s:${item.name}:${size.amount}`),
    ),
  );
  rows.push([Markup.button.callback("← Назад", "m:back")]);
  return Markup.inlineKeyboard(rows);
}

export async function handleMenuCommand(ctx: Context): Promise<void> {
  const open = getOpenShift();
  if (!open) {
    await ctx.reply("⚠️ Сначала открой смену: /go");
    return;
  }
  await ctx.reply("Выбери напиток:", categoryKeyboard());
}

export async function handleMenuCallback(ctx: Context): Promise<void> {
  const cb = ctx.callbackQuery as CallbackQuery.DataQuery;
  const data = cb?.data ?? "";

  if (data === "m:back") {
    await ctx.editMessageText("Выбери категорию:", categoryKeyboard());
    await ctx.answerCbQuery();
    return;
  }

  if (data.startsWith("m:cat:")) {
    const catId = data.slice(6);
    const cat = MENU.find((c) => c.id === catId);
    if (!cat) { await ctx.answerCbQuery("Категория не найдена"); return; }
    await ctx.editMessageText(`${cat.emoji} ${cat.title}:`, itemsKeyboard(catId)!);
    await ctx.answerCbQuery();
    return;
  }

  if (data.startsWith("m:s:")) {
    // формат: m:s:Название:сумма
    const payload = data.slice(4);
    const lastColon = payload.lastIndexOf(":");
    const name = payload.slice(0, lastColon);
    const amount = Number(payload.slice(lastColon + 1));

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      await ctx.answerCbQuery("Ошибка данных");
      return;
    }

    const userId = ctx.from?.id;
    if (userId === undefined) { await ctx.answerCbQuery(); return; }

    const open = getOpenShift();
    if (!open) {
      await ctx.answerCbQuery("Нет открытой смены!");
      await ctx.reply("⚠️ Сначала открой смену: /go");
      return;
    }

    const amountCents = Math.round(amount * 100);
    const sale = addSale({ shiftId: open.id, userId, amountCents, cups: 1, note: name });
    const toBurn = CONFIG.burnPerCup;

    await ctx.answerCbQuery(`✅ ${name} ${amount}₽`);
    await ctx.reply(
      `☕ Продажа #${sale.id}\n${name} — ${amount}₽\n\n🔥 Сжигаю ${toBurn} $DOFFA...`,
    );

    if (!isBurnConfigured()) {
      await ctx.reply(`⚠️ OWNER_KEYPAIR не задан — burn отложен.`);
      return;
    }

    try {
      const result = await burnCoffee({ qty: toBurn, saleId: sale.id, receiptHash: sale.receipt_hash });
      markAsBurned(sale.id, result.sig);
      await ctx.reply(`✅ ${toBurn} $DOFFA сожжено!\nTX: ${result.solscan}\n\nОшиблись? /cancel`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`⚠️ Продажа записана, но burn не прошёл:\n${msg}`);
    }
    return;
  }

  await ctx.answerCbQuery();
}
