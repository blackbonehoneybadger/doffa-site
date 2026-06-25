// Команда /sale — пробить продажу и автоматически сжечь $DOFFA на Solana.
//   /sale 150            — продажа на 150 ₽, 1 чашка
//   /sale 150 Капучино   — то же, с заметкой
//   /sale 300 x2 Латте   — 300 ₽, 2 чашки, заметка "Латте"
import type { Context } from "telegraf";
import { getOpenShift, addSale, markAsBurned } from "../db.js";
import { burnCoffee, isBurnConfigured } from "../burn.js";
import { CONFIG } from "../config.js";
import { formatRub } from "../format.js";

export async function handleSale(ctx: Context, arg: string): Promise<void> {
  const userId = ctx.from?.id;
  if (userId === undefined) return;

  const open = getOpenShift();
  if (!open) {
    await ctx.reply("⚠️ Сначала открой смену: /go");
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

  // Сразу пишем что продажа записана и запускаем burn
  await ctx.reply(
    `☕ Продажа #${sale.id} записана\n` +
      `Сумма: ${formatRub(amountCents)}\n` +
      `Чашек: ${cups}` +
      (note ? `\nЗаметка: ${note}` : "") +
      `\n\n🔥 Сжигаю ${toBurn} $DOFFA...`,
  );

  // Автоматическое сжигание на Solana
  if (!isBurnConfigured()) {
    await ctx.reply(
      `⚠️ OWNER_KEYPAIR не задан — burn отложен.\n` +
        `Чек: sale#${sale.id} | ${sale.receipt_hash}\n` +
        `Добавь OWNER_KEYPAIR в Railway Variables.`,
    );
    return;
  }

  try {
    const result = await burnCoffee({
      qty: toBurn,
      saleId: sale.id,
      receiptHash: sale.receipt_hash,
    });

    markAsBurned(sale.id, result.sig);

    await ctx.reply(
      `✅ ${toBurn} $DOFFA сожжено!\n` +
        `TX: ${result.solscan}\n\n` +
        `Запись навсегда в блокчейне Solana.\n` +
        `Ошиблись? /cancel`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.reply(
      `⚠️ Продажа записана, но burn не прошёл:\n${msg}\n\n` +
        `Чек: sale#${sale.id} | ${sale.receipt_hash}\n` +
        `Можно сжечь вручную позже.`,
    );
  }
}
