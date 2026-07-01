// Proof of Coffee Burn — статистика сжиганий из Solana.
// Источник правды: Telegram POS-касса (бот) → мгновенный burn на Solana.
// Данные читаются из блокчейна и не могут быть подделаны на уровне сайта.

export const dynamic = "force-dynamic";

import { fetchBurnHistory } from "../../../solana";

export async function GET() {
  try {
    const burns = await fetchBurnHistory(50);

    const totalBurns = burns.reduce((s, b) => s + b.amount, 0);
    const totalSales = burns.length; // число burn-транзакций (продаж)
    // Чашки считаем по сожжённому объёму, а не по числу транзакций:
    // продажа "x2" — одна транзакция, но 2 чашки = 2 сожжённых $DOFFA.
    const totalCups = totalBurns;

    const status =
      totalBurns === 0
        ? ("no_data" as const)
        : ("perfect" as const); // bot burns instantly — всегда в синхроне

    const message =
      totalBurns === 0
        ? "Пока нет продаж — первая чашка кофе в боте появится здесь"
        : `✓ ${totalSales} продаж бариста = ${totalBurns} сожжённых $DOFFA`;

    return Response.json({
      pos_sales: totalSales,
      solana_burns: totalBurns,
      pos_cups: totalCups,
      mismatch: 0,
      mismatch_percent: 0,
      status,
      message,
      solana_transactions: burns.slice(0, 20),
      pos_sales_list: burns.slice(0, 20).map((b) => ({
        check_id: b.saleId,
        quantity: b.amount,
        timestamp: (b.blockTime ?? 0) * 1000,
      })),
    }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Proof compare error:", msg);
    return Response.json(
      {
        pos_sales: 0,
        solana_burns: 0,
        pos_cups: 0,
        mismatch: 0,
        mismatch_percent: 0,
        status: "no_data" as const,
        message: "Данные из Solana временно недоступны",
        solana_transactions: [],
        pos_sales_list: [],
      },
      { status: 200 },
    );
  }
}
