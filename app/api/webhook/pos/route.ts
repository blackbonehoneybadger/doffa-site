// POS-интеграция: принимаем события продажи от кассовых систем
// (Square / Shopify / Clover / Stripe / любой вебхук).
//
// Логика:
//   1. Принимаем вебхук с данными продажи
//   2. Формируем анонимный receipt_hash = SHA-256(sale_id + amount + ts + SALT)
//      — никакие персональные данные покупателя не сохраняются
//   3. Возвращаем команду для сжигания токенов, которую оператор запускает вручную:
//      npm run burn -- {qty} "{sale_id}" "{receipt_hash}"
//
// Когда burn выполнен, запись появляется в блокчейне Solana с этим memo —
// и её может проверить любой желающий в Solscan или в дашборде на сайте.

export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";

const SALT = process.env.RECEIPT_HASH_SALT ?? "doffa-devnet-salt-change-on-mainnet";

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

// Нормализуем входящий payload из разных POS-систем в единый формат.
type SaleEvent = {
  sale_id: string;   // уникальный ID продажи в POS
  qty: number;       // количество проданных чашек кофе
  amount_cents: number; // сумма в копейках/центах (для хеша, без PII)
  ts: number;        // unix timestamp продажи
  pos: string;       // square | shopify | clover | stripe | manual
};

function parseSaleEvent(body: Record<string, unknown>, pos: string): SaleEvent | null {
  // Square: https://developer.squareup.com/docs/webhooks/square-webhooks
  if (pos === "square") {
    const evt = body as { data?: { object?: { payment?: { id?: string; amount_money?: { amount?: number }; created_at?: string } } } };
    const payment = evt.data?.object?.payment;
    if (!payment?.id) return null;
    return {
      sale_id: payment.id,
      qty: 1,
      amount_cents: payment.amount_money?.amount ?? 0,
      ts: payment.created_at ? new Date(payment.created_at).getTime() : Date.now(),
      pos: "square",
    };
  }

  // Shopify: https://shopify.dev/docs/api/admin-rest/webhooks
  if (pos === "shopify") {
    const order = body as { id?: number; total_price?: string; created_at?: string; line_items?: unknown[] };
    if (!order.id) return null;
    return {
      sale_id: `shopify-${order.id}`,
      qty: Array.isArray(order.line_items) ? order.line_items.length : 1,
      amount_cents: Math.round(parseFloat(order.total_price ?? "0") * 100),
      ts: order.created_at ? new Date(order.created_at).getTime() : Date.now(),
      pos: "shopify",
    };
  }

  // Stripe: https://stripe.com/docs/webhooks
  if (pos === "stripe") {
    const evt = body as { data?: { object?: { id?: string; amount?: number; created?: number } } };
    const obj = evt.data?.object;
    if (!obj?.id) return null;
    return {
      sale_id: obj.id,
      qty: 1,
      amount_cents: obj.amount ?? 0,
      ts: (obj.created ?? 0) * 1000,
      pos: "stripe",
    };
  }

  // Manual / Generic: { sale_id, qty, amount_cents, ts }
  const m = body as { sale_id?: string; qty?: number; amount_cents?: number; ts?: number };
  if (!m.sale_id) return null;
  return {
    sale_id: m.sale_id,
    qty: m.qty ?? 1,
    amount_cents: m.amount_cents ?? 0,
    ts: m.ts ?? Date.now(),
    pos: "manual",
  };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const pos = url.searchParams.get("pos") ?? "manual";

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const sale = parseSaleEvent(body, pos);
  if (!sale) {
    return Response.json({ ok: false, error: "Could not parse sale event" }, { status: 422 });
  }

  // Анонимный хеш для on-chain записи (не содержит PII)
  const receipt_hash = sha256(`${sale.sale_id}|${sale.amount_cents}|${sale.ts}|${SALT}`).slice(0, 16);

  const burn_command = `cd token && npm run burn -- ${sale.qty} "${sale.sale_id}" "${receipt_hash}"`;

  return Response.json({
    ok: true,
    sale_id: sale.sale_id,
    qty: sale.qty,
    receipt_hash,
    pos: sale.pos,
    // Команда для оператора — запустить в терминале после получения вебхука
    burn_command,
    instructions: [
      "1. Убедитесь, что .env и owner.json настроены в папке token/",
      "2. Запустите burn_command в терминале сервера",
      "3. Burn появится в Solscan и в публичном дашборде на сайте автоматически",
    ],
  });
}
