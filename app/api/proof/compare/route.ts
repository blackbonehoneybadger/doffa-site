// Proof of Coffee Burn — сравнение CloudShop продаж vs Solana burns
// Дашборд показывает: сколько кофе продали в CloudShop vs сколько токенов сожгли

export const dynamic = "force-dynamic";

import { fetchBurnHistory, type BurnRecord } from "../../../solana";

const CLOUDSHOP_API_KEY = process.env.CLOUDSHOP_API_KEY;
const CLOUDSHOP_ACCOUNT_ID = process.env.CLOUDSHOP_ACCOUNT_ID;

type ComparisonData = {
  cloudshop_cups: number;
  solana_burns: number;
  mismatch: number;
  mismatch_percent: number;
  status: "perfect" | "warning" | "error" | "no_data";
  message: string;
  cloudshop_sales: Array<{
    check_id: string;
    quantity: number;
    timestamp: number;
  }>;
  solana_transactions: BurnRecord[];
};

export async function GET() {
  try {
    // 1. Получаем данные из CloudShop (оплаченные чеки за 7 дней)
    let cloudshopCups = 0;
    let cloudshopSales = [];

    if (CLOUDSHOP_API_KEY && CLOUDSHOP_ACCOUNT_ID) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isoDate = sevenDaysAgo.toISOString();

      try {
        const resp = await fetch(
          `https://api.cloudshop.ru/v1/accounts/${CLOUDSHOP_ACCOUNT_ID}/checks?` +
          `status=PAID&created_at_min=${encodeURIComponent(isoDate)}&limit=100`,
          {
            headers: {
              "Authorization": `Bearer ${CLOUDSHOP_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (resp.ok) {
          const data = await resp.json() as {
            checks?: Array<{
              id: string;
              status: string;
              items?: Array<{
                name: string;
                quantity: number;
                category_name?: string;
              }>;
              created_at?: string;
            }>;
          };

          const coffeeKeywords = [
            "кофе",
            "coffee",
            "напиток",
            "drink",
            "эспрессо",
            "americano",
            "cappuccino",
            "latte",
            "макиато",
            "флэт",
          ];

          if (Array.isArray(data.checks)) {
            for (const check of data.checks) {
              let cupCount = 0;
              if (Array.isArray(check.items)) {
                for (const item of check.items) {
                  const itemName = (item.name || "").toLowerCase();
                  const categoryName = (item.category_name || "").toLowerCase();
                  const isCoffee = coffeeKeywords.some(
                    (kw) => categoryName.includes(kw) || itemName.includes(kw)
                  );
                  if (isCoffee) {
                    cupCount += Math.max(1, Math.floor(item.quantity || 1));
                  }
                }
              }

              if (cupCount > 0) {
                cloudshopCups += cupCount;
                cloudshopSales.push({
                  check_id: check.id,
                  quantity: cupCount,
                  timestamp: check.created_at
                    ? new Date(check.created_at).getTime()
                    : Date.now(),
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("CloudShop fetch error:", err);
      }
    }

    // 2. Получаем данные из Solana (последние burns)
    let solanaBurns = 0;
    let solanaTransactions: BurnRecord[] = [];

    try {
      const burnHistory = await fetchBurnHistory(50);
      solanaBurns = burnHistory.reduce((sum, b) => sum + b.amount, 0);
      solanaTransactions = burnHistory;
    } catch (err) {
      console.error("Solana fetch error:", err);
    }

    // 3. Сравниваем и определяем статус
    const mismatch = Math.abs(cloudshopCups - solanaBurns);
    const mismatchPercent =
      cloudshopCups > 0
        ? Math.round((mismatch / cloudshopCups) * 100)
        : 0;

    let status: "perfect" | "warning" | "error" | "no_data" = "no_data";
    let message = "";

    if (cloudshopCups === 0 && solanaBurns === 0) {
      status = "no_data";
      message =
        "Пока нет данных — первые оплаченные чеки в CloudShop появятся здесь";
    } else if (cloudshopCups === solanaBurns) {
      status = "perfect";
      message = `✓ Синхронизация идеальна: ${cloudshopCups} чашек кофе = ${solanaBurns} сожженных DOFFA`;
    } else if (mismatch <= 2) {
      status = "warning";
      message = `⚠ Небольшое расхождение: ${cloudshopCups} куплено, ${solanaBurns} сожжено (разница ${mismatch})`;
    } else {
      status = "error";
      message = `✗ Большое расхождение: ${cloudshopCups} куплено, ${solanaBurns} сожжено. Проверьте операции на сервере.`;
    }

    const result: ComparisonData = {
      cloudshop_cups: cloudshopCups,
      solana_burns: solanaBurns,
      mismatch,
      mismatch_percent: mismatchPercent,
      status,
      message,
      cloudshop_sales: cloudshopSales.slice(0, 20),
      solana_transactions: solanaTransactions.slice(0, 20),
    };

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Proof comparison error:", msg);

    return Response.json(
      {
        cloudshop_cups: 0,
        solana_burns: 0,
        mismatch: 0,
        mismatch_percent: 0,
        status: "error" as const,
        message: `Ошибка получения данных: ${msg}`,
        cloudshop_sales: [],
        solana_transactions: [],
      },
      { status: 500 }
    );
  }
}
