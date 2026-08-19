import { requireAdminApi } from "../../../lib/adminApi";
import { query } from "../../../lib/db";
import { REAL, fetchSupply } from "../../../solana";
import { reportServerError } from "../../../lib/serverError";

export const dynamic = "force-dynamic";

// Дашборд админа: посетители (из БД), объём в обороте и сожжено (с блокчейна).
export async function GET() {
  // isAuthed() ходит в БД (admin_sessions). Если хранилище сессий недоступно —
  // отдаём контролируемый 503, а не необработанный 500. Авторизация fail-closed.
  const authError = await requireAdminApi();
  if (authError) return authError;

  // null = данные недоступны (нет таблицы / сбой БД), 0 = реально ноль посещений.
  // Число из БД валидируем: битое значение (NaN) тоже считаем «недоступно».
  let visits: number | null = null;
  try {
    const rows = await query<{ value: string }>(`select value from site_stats where key = 'visits'`);
    const parsed = rows[0] ? Number(rows[0].value) : 0;
    visits = Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    // таблицы может ещё не быть до миграции — оставляем null (неизвестно)
    reportServerError("admin stats visits failed", err);
  }

  let circulating: number | null = null;
  let burned: number | null = null;
  try {
    circulating = await fetchSupply();
    burned = Math.max(0, REAL.initialSupply - circulating);
  } catch (err) {
    // RPC недоступен — отдадим null, клиент покажет «—»
    reportServerError("admin stats supply failed", err);
  }

  return Response.json({ ok: true, visits, circulating, burned, initialSupply: REAL.initialSupply });
}
