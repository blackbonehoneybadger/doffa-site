import { query } from "../../lib/db";
import { crossOriginError, visitorFingerprint } from "../../lib/requestSecurity";

// Публичный «маячок» посещения. Считаем максимум одно посещение в сутки для
// псевдонимного HMAC(IP + User-Agent), иначе один скрипт мог бесконечно
// накручивать метрику и создавать лишние записи/расходы БД.
export async function POST(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;

  const secret = process.env.SESSION_SECRET?.trim();
  // Без секрета нельзя хранить обратимый IP и нельзя делать нестабильный хэш.
  // Метрика некритична — просто не считаем до корректной настройки окружения.
  if (!secret) return Response.json({ ok: true });

  try {
    const visitorHash = visitorFingerprint(request, secret);
    await query(
      `with first_visit as (
         insert into site_visit_days (visitor_hash, visit_day)
         values ($1, current_date)
         on conflict (visitor_hash, visit_day) do nothing
         returning 1
       )
       insert into site_stats (key, value)
       select 'visits', 1 from first_visit
       on conflict (key) do update
         set value = site_stats.value + 1, updated_at = now()`,
      [visitorHash],
    );
    await query(`delete from site_visit_days where visit_day < current_date - 31`).catch(() => {});
  } catch {
    // счётчик не критичен
  }
  return Response.json({ ok: true });
}
