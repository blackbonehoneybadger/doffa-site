// CloudShop API — получение данных о проданных кофе/напитках для дашборда
// Читаем оплаченные чеки из CloudShop и считаем кофе-товары.

export const dynamic = "force-dynamic";

const CLOUDSHOP_API_KEY = process.env.CLOUDSHOP_API_KEY;
const CLOUDSHOP_ACCOUNT_ID = process.env.CLOUDSHOP_ACCOUNT_ID;

type CloudShopSale = {
  check_id: string;
  quantity: number;
  amount_rubles: number;
  payment_method: string;
  timestamp: number;
};

export async function GET() {
  // Если CloudShop не настроен, возвращаем пустой массив
  if (!CLOUDSHOP_API_KEY || !CLOUDSHOP_ACCOUNT_ID) {
    return Response.json({
      ok: false,
      error: "CloudShop not configured",
      sales: [],
      total_cups: 0,
      hint: "Set CLOUDSHOP_API_KEY and CLOUDSHOP_ACCOUNT_ID in .env",
    });
  }

  try {
    // Запрашиваем последние оплаченные чеки (примерно за 7 дней)
    // CloudShop API: GET https://api.cloudshop.ru/v1/accounts/{account_id}/checks
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const isoDate = sevenDaysAgo.toISOString();

    const cloudshopResponse = await fetch(
      `https://api.cloudshop.ru/v1/accounts/${CLOUDSHOP_ACCOUNT_ID}/checks?` +
      `status=PAID&created_at_min=${encodeURIComponent(isoDate)}&limit=100`,
      {
        headers: {
          "Authorization": `Bearer ${CLOUDSHOP_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!cloudshopResponse.ok) {
      console.error(
        `CloudShop API error: ${cloudshopResponse.status} ${cloudshopResponse.statusText}`
      );
      return Response.json(
        {
          ok: false,
          error: `CloudShop API error: ${cloudshopResponse.status}`,
          sales: [],
          total_cups: 0,
        },
        { status: 502 }
      );
    }

    const cloudshopData = await cloudshopResponse.json() as {
      checks?: Array<{
        id: string;
        status: string;
        total_sum: number;
        items?: Array<{
          name: string;
          quantity: number;
          category_name?: string;
        }>;
        payments?: Array<{ method: string; sum: number }>;
        created_at?: string;
      }>;
    };

    // Парсим чеки и считаем кофе
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

    const sales: CloudShopSale[] = [];
    let totalCups = 0;

    if (Array.isArray(cloudshopData.checks)) {
      for (const check of cloudshopData.checks) {
        if (check.status !== "PAID") continue;

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
          const payment = Array.isArray(check.payments)
            ? check.payments[0]?.method || "unknown"
            : "unknown";

          sales.push({
            check_id: check.id,
            quantity: cupCount,
            amount_rubles: check.total_sum / 100,
            payment_method: payment,
            timestamp: check.created_at
              ? new Date(check.created_at).getTime()
              : Date.now(),
          });

          totalCups += cupCount;
        }
      }
    }

    // Сортируем по времени (новые первыми)
    sales.sort((a, b) => b.timestamp - a.timestamp);

    return Response.json({
      ok: true,
      sales: sales.slice(0, 20), // Последние 20 продаж
      total_cups: totalCups,
      period_days: 7,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("CloudShop API error:", msg);
    return Response.json(
      {
        ok: false,
        error: msg,
        sales: [],
        total_cups: 0,
      },
      { status: 500 }
    );
  }
}
