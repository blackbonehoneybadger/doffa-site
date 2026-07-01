// Server-side proxy для истории сжиганий — позволяет кэшировать RPC-запросы
// и не раскрывать лишнего в клиентском коде.
// Клиентский дашборд может использовать либо этот эндпоинт, либо читать напрямую.
export const dynamic = "force-dynamic";

import { fetchBurnHistory } from "../../solana";

export async function GET() {
  try {
    const burns = await fetchBurnHistory(20);
    return Response.json({ ok: true, burns }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RPC error";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
