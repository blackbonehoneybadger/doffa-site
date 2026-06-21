// Продажи из Telegram POS-бота — читаем из Solana-истории burns.
// Этот endpoint обратно совместим — UI сайта использует его для дашборда.

export const dynamic = "force-dynamic";

import { fetchBurnHistory } from "../../../solana";

export async function GET() {
  try {
    const burns = await fetchBurnHistory(30);

    const sales = burns.map((b) => ({
      check_id: b.saleId || b.sig.slice(0, 8),
      quantity: b.amount,
      amount_rubles: 0, // сумма хранится только в боте, не в блокчейне
      payment_method: "bot",
      timestamp: (b.blockTime ?? 0) * 1000,
    }));

    return Response.json({
      ok: true,
      sales,
      total_cups: burns.reduce((s, b) => s + b.amount, 0),
      period_days: 7,
      source: "solana",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { ok: false, error: msg, sales: [], total_cups: 0 },
      { status: 200 },
    );
  }
}
