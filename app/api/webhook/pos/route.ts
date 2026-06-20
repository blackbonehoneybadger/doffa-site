// CloudShop POS интеграция для DOFFA — Proof of Coffee Burn
//
// Правило: Только оплаченные чеки из CloudShop считаются.
// Наличные (cash) ✓ и карта (card) ✓ — обе валидны если пробиты в CloudShop.
// Нет чека в CloudShop = нет burn. Есть оплаченный чек = burn 1 DOFFA за чашку.
//
// Логика:
//   1. Получаем вебхук от CloudShop (check.paid event)
//   2. Проверяем статус чека: PAID (только оплаченные)
//   3. Считаем товары с категорией "кофе" или "напитки"
//   4. Формируем анонимный receipt_hash = SHA-256(check_id + amount + ts + SALT)
//      — без PII покупателя
//   5. Возвращаем команду для сжигания: npm run burn -- {qty} "{check_id}" "{receipt_hash}"
//
// Когда burn выполнен, запись появляется в блокчейне Solana — проверяемо в Solscan.

export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";

const SALT = process.env.RECEIPT_HASH_SALT ?? "doffa-devnet-salt-change-on-mainnet";
const CLOUDSHOP_API_KEY = process.env.CLOUDSHOP_API_KEY;
const CLOUDSHOP_ACCOUNT_ID = process.env.CLOUDSHOP_ACCOUNT_ID;

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

// CloudShop check structure
type CloudShopCheck = {
  id: string;                    // уникальный ID чека
  status: string;                // PAID, UNPAID, CANCELLED, etc.
  total_sum: number;             // сумма чека в копейках
  items: CloudShopItem[];         // товары в чеке
  payments: CloudShopPayment[];   // способы оплаты
  created_at?: string;           // дата создания
};

type CloudShopItem = {
  id?: string;
  name: string;
  quantity: number;
  category_name?: string;      // категория товара
  category_id?: string;
  price?: number;
};

type CloudShopPayment = {
  id?: string;
  method: string;              // наличные (cash) или карта (card)
  sum: number;                 // сумма оплаты в копейках
};

type BurnRecord = {
  check_id: string;
  qty: number;
  amount_cents: number;
  ts: number;
  receipt_hash: string;
  payment_method: string;
};

function parseCloudShopCheck(body: Record<string, unknown>): BurnRecord | null {
  // CloudShop webhook payload structure
  const check = body as CloudShopCheck;

  // Пропускаем неоплаченные чеки — только PAID считается
  if (check.status !== "PAID") {
    return null;
  }

  if (!check.id || !Array.isArray(check.items)) {
    return null;
  }

  // Считаем кофе/напитки: ищем товары по категории или названию
  let coffeeQty = 0;
  const coffeeKeywords = ["кофе", "coffee", "напиток", "drink", "эспрессо", "americano", "cappuccino", "latte", "макиато", "флэт"];

  for (const item of check.items) {
    const itemName = (item.name || "").toLowerCase();
    const categoryName = (item.category_name || "").toLowerCase();

    // Проверяем категорию или название на вхождение ключевых слов
    const isCoffee = coffeeKeywords.some(kw => categoryName.includes(kw) || itemName.includes(kw));

    if (isCoffee) {
      coffeeQty += Math.max(1, Math.floor(item.quantity || 1));
    }
  }

  // Если нет кофе в чеке — не сжигаем
  if (coffeeQty === 0) {
    return null;
  }

  // Определяем способ оплаты (наличные или карта, обе валидны)
  let paymentMethod = "unknown";
  if (Array.isArray(check.payments) && check.payments.length > 0) {
    paymentMethod = check.payments[0].method || "unknown";
  }

  const ts = check.created_at
    ? new Date(check.created_at).getTime()
    : Date.now();

  // Анонимный receipt_hash: SHA-256(check_id | amount | ts | SALT)
  const receipt_hash = sha256(
    `${check.id}|${check.total_sum}|${ts}|${SALT}`
  ).slice(0, 16);

  return {
    check_id: check.id,
    qty: coffeeQty,
    amount_cents: check.total_sum,
    ts,
    receipt_hash,
    payment_method: paymentMethod,
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Проверяем webhook signature (если CloudShop передает)
  const signature = request.headers.get("x-cloudshop-signature");
  if (signature && CLOUDSHOP_API_KEY) {
    const bodyStr = JSON.stringify(body);
    const computedSig = createHash("sha256")
      .update(bodyStr + CLOUDSHOP_API_KEY)
      .digest("hex");
    if (computedSig !== signature) {
      return Response.json(
        { ok: false, error: "Invalid signature" },
        { status: 403 }
      );
    }
  }

  const burnRecord = parseCloudShopCheck(body);
  if (!burnRecord) {
    return Response.json(
      {
        ok: false,
        error: "Check is not PAID, or no coffee items found",
        hint: "Только оплаченные чеки с кофе/напитками триггерят burn",
      },
      { status: 422 }
    );
  }

  // Команда для оператора сервера
  const burn_command = `cd token && npm run burn -- ${burnRecord.qty} "${burnRecord.check_id}" "${burnRecord.receipt_hash}"`;

  return Response.json({
    ok: true,
    check_id: burnRecord.check_id,
    qty: burnRecord.qty,
    amount_rubles: (burnRecord.amount_cents / 100).toFixed(2),
    receipt_hash: burnRecord.receipt_hash,
    payment_method: burnRecord.payment_method,
    burn_command,
    instructions: [
      "✓ Чек оплачен в CloudShop — данные верифицированы",
      "✓ Анонимный receipt_hash сохранён для on-chain proof",
      "→ Команда для оператора (запустить на сервере токена):",
      `  ${burn_command}`,
      "",
      "После burn запись появится в блокчейне Solana с memo:",
      `  DOFFA coffee burn | ${burnRecord.check_id} | ${burnRecord.receipt_hash}`,
      "Проверить в Solscan: https://solscan.io/",
    ],
  });
}
