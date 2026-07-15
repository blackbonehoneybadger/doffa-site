import { isAuthed } from "../../../lib/adminAuth";
import { query } from "../../../lib/db";
import { REAL, fetchSupply } from "../../../solana";

export const dynamic = "force-dynamic";

// Дашборд админа: посетители (из БД), объём в обороте и сожжено (с блокчейна).
export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  let visits = 0;
  try {
    const rows = await query<{ value: string }>(`select value from site_stats where key = 'visits'`);
    if (rows[0]) visits = Number(rows[0].value);
  } catch {
    // таблицы может ещё не быть до миграции — показываем 0
  }

  let circulating: number | null = null;
  let burned: number | null = null;
  try {
    circulating = await fetchSupply();
    burned = Math.max(0, REAL.initialSupply - circulating);
  } catch {
    // RPC недоступен — отдадим null, клиент покажет «—»
  }

  return Response.json({ ok: true, visits, circulating, burned, initialSupply: REAL.initialSupply });
}
