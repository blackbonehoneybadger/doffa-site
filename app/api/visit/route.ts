import { query } from "../../lib/db";

/** Увеличивает счётчик просмотров главной. Идемпотентность — на клиенте (раз за сессию). */
export async function POST() {
  try {
    await query(
      `insert into site_counters (key, value, updated_at)
       values ('page_views', 1, now())
       on conflict (key) do update set
         value = site_counters.value + 1,
         updated_at = now()`,
    );
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
