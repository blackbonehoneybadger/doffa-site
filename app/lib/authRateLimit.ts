// Rate limit для /api/auth/nonce и /api/auth/verify — по ключу (IP / wallet).
// Окно 5 минут; счётчик в Postgres, чтобы лимит держался между serverless-инстансами.
import { query } from "./db";

export const AUTH_RATE_WINDOW_MINUTES = 5;
export const NONCE_MAX_PER_WINDOW = 30;
export const VERIFY_IP_MAX_PER_WINDOW = 20;
export const VERIFY_WALLET_MAX_PER_WINDOW = 10;

/**
 * Учитывает удар по ключу. ok=false → лимит исчерпан (ответ 429).
 * Без БД ошибка пробрасывается наверх — caller решает 503.
 */
export async function hitAuthRateLimit(
  key: string,
  maxHits: number,
  windowMinutes = AUTH_RATE_WINDOW_MINUTES,
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  // windowMinutes — константа модуля / наш код, не пользовательский ввод.
  const rows = await query<{ hit_count: number }>(
    `insert into auth_rate_limits (rate_key, hit_count, window_started_at)
     values ($1, 1, now())
     on conflict (rate_key) do update set
       hit_count = case
         when auth_rate_limits.window_started_at < now() - interval '${windowMinutes} minutes'
         then 1 else auth_rate_limits.hit_count + 1 end,
       window_started_at = case
         when auth_rate_limits.window_started_at < now() - interval '${windowMinutes} minutes'
         then now() else auth_rate_limits.window_started_at end
     returning hit_count`,
    [key],
  );
  const count = rows[0]?.hit_count ?? maxHits + 1;
  await query(
    `delete from auth_rate_limits
     where window_started_at < now() - interval '1 day'`,
  ).catch(() => {});
  if (count > maxHits) return { ok: false, count };
  return { ok: true, count };
}

/** IP из заголовков прокси (Vercel: x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
