// Webhook от Telegram POS-бота — принимает уведомления о продажах.
// Бот сам выполняет burn на Solana; этот endpoint опциональный (для логирования).
// Данные о сожжениях читаются напрямую из Solana — это источник правды.

export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";

const SALT = process.env.RECEIPT_HASH_SALT ?? "doffa-pos-salt-change-on-mainnet";

function sha256hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

type PosSalePayload = {
  sale_id: number;
  cups: number;
  amount_cents: number;
  note?: string;
  receipt_hash: string;
  tx_hash?: string;       // TX Solana если burn уже выполнен
  shift_id: number;
  created_at: number;
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const sale = body as PosSalePayload;

  if (!sale.sale_id || !sale.cups || !sale.receipt_hash) {
    return Response.json({ ok: false, error: "Missing required fields" }, { status: 422 });
  }

  // Верифицируем receipt_hash от бота
  const expectedHash = sha256hex(
    `${sale.sale_id}|${sale.shift_id}|${sale.amount_cents}|${sale.created_at}|${SALT}`
  ).slice(0, 16);

  const verified = sale.receipt_hash === expectedHash;

  return Response.json({
    ok: true,
    sale_id: sale.sale_id,
    cups: sale.cups,
    tx_hash: sale.tx_hash ?? null,
    verified,
    message: sale.tx_hash
      ? `✓ Продажа #${sale.sale_id}: ${sale.cups} чашек, TX сохранён`
      : `✓ Продажа #${sale.sale_id}: ${sale.cups} чашек записана`,
  });
}
