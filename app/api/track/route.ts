import { query } from "../../lib/db";

// Публичный «маячок» посещения. Клиент вызывает один раз за сессию браузера.
// Это грубая vanity-метрика для админ-дашборда, не аналитика и не безопасность —
// поэтому при любой ошибке (нет БД, нет таблицы) просто молча отвечаем ok.
export async function POST() {
  try {
    await query(
      `insert into site_stats (key, value) values ('visits', 1)
       on conflict (key) do update set value = site_stats.value + 1, updated_at = now()`,
    );
  } catch {
    // счётчик не критичен
  }
  return Response.json({ ok: true });
}
