import { isAuthed } from "../../../lib/adminAuth";
import { query } from "../../../lib/db";
import { REAL, fetchSupply } from "../../../solana";

export const dynamic = "force-dynamic";

// Дашборд админа: посетители (из БД), объём в обороте и сожжено (с блокчейна).
export async function GET() {
  // isAuthed() ходит в БД (admin_sessions). Если хранилище сессий недоступно —
  // отдаём контролируемый 503, а не необработанный 500. Авторизация fail-closed.
  let authed: boolean;
  try {
    authed = await isAuthed();
  } catch {
    return Response.json({ ok: false, error: "Сервис временно недоступен" }, { status: 503 });
  }
  if (!authed) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  // null = данные недоступны (нет таблицы / сбой БД), 0 = реально ноль посещений.
  let visits: number | null = null;
  try {
    const rows = await query<{ value: string }>(`select value from site_stats where key = 'visits'`);
    visits = rows[0] ? Number(rows[0].value) : 0;
  } catch {
    // таблицы может ещё не быть до миграции — оставляем null (неизвестно)
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
