import { query } from "../../../lib/db";
import { parseJson, merchOrderSchema } from "../../../lib/validation";
import { MERCH } from "../../../config/merch";
import { clientIp, crossOriginError } from "../../../lib/requestSecurity";

// Приём заявок на кожаные изделия. Честно: если онлайн-приём не включён
// (NEXT_PUBLIC_MERCH_ORDERS_ENABLED != true) — не делаем вид, что отправили,
// а возвращаем статус «готовится» (клиент предложит написать напрямую).
const MAX_PER_WINDOW = 5;
const WINDOW_MINUTES = 60;

export async function POST(req: Request) {
  const originError = crossOriginError(req);
  if (originError) return originError;

  if (!MERCH.ordersEnabled) {
    return Response.json(
      { ok: false, code: "disabled", error: "Онлайн-приём заявок пока готовится" },
      { status: 503 },
    );
  }

  const parsed = await parseJson(req, merchOrderSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const d = parsed.data;

  // Honeypot: заполнен только ботами — тихо «успех», ничего не пишем.
  if (d.website) {
    return Response.json({ ok: true });
  }

  const ip = clientIp(req);
  try {
    // Rate limit по IP: не больше MAX_PER_WINDOW заявок за окно.
    const rows = await query<{ count: number; blocked: boolean }>(
      `insert into merch_order_attempts (ip, count, window_start)
       values ($1, 1, now())
       on conflict (ip) do update set
         count = case when merch_order_attempts.window_start < now() - interval '${WINDOW_MINUTES} minutes'
                      then 1 else merch_order_attempts.count + 1 end,
         window_start = case when merch_order_attempts.window_start < now() - interval '${WINDOW_MINUTES} minutes'
                      then now() else merch_order_attempts.window_start end
       returning count, (count > ${MAX_PER_WINDOW}) as blocked`,
      [ip],
    );
    if (rows[0]?.blocked) {
      return Response.json(
        { ok: false, error: "Слишком много заявок. Попробуй позже или напиши напрямую." },
        { status: 429 },
      );
    }

    // IP — персональные служебные данные. Старые антиспам-записи не храним
    // бессрочно; чистка не должна мешать приёму текущей заявки.
    await query(
      `delete from merch_order_attempts where window_start < now() - interval '30 days'`,
    ).catch(() => {});

    await query(
      `insert into merch_orders
        (name, contact, product_type, quantity, personalization, perso_text, idea, deadline, budget, location)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [d.name, d.contact, d.productType, d.quantity, d.personalization, d.persoText, d.idea, d.deadline, d.budget, d.location],
    );
    return Response.json({ ok: true });
  } catch {
    // База недоступна / нет таблицы — честная ошибка, а не фальшивый успех.
    return Response.json(
      { ok: false, error: "Не удалось принять заявку. Напиши нам напрямую — мы на связи." },
      { status: 503 },
    );
  }
}
