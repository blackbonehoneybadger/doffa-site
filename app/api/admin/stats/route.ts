import { isAuthed } from "../../../lib/adminAuth";
import { query } from "../../../lib/db";
import { ECOSYSTEM } from "../../../config/ecosystem";
import { getJetton, getJettonBalance } from "../../../lib/ton/chain";

export const dynamic = "force-dynamic";

// Дашборд админа: посетители (из БД), эмиссия, сожжено и остаток фонда наград —
// всё из сети TON. Раньше здесь читалась прежняя монета в Solana; теперь ею не
// пользуемся, и владельцу нужны цифры его настоящей монеты.
export async function GET() {
  // isAuthed() ходит в БД (admin_sessions). Если хранилище сессий недоступно —
  // отдаём контролируемый 503, а не необработанный 500. Авторизация fail-closed.
  let authed: boolean;
  try {
    authed = await isAuthed();
  } catch (err) {
    console.error("admin/stats: проверка сессии упала", err);
    return Response.json({ ok: false, error: "Сервис временно недоступен" }, { status: 503 });
  }
  if (!authed) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  // null = данные недоступны (нет таблицы / сбой БД), 0 = реально ноль посещений.
  // Число из БД валидируем: битое значение (NaN) тоже считаем «недоступно».
  let visits: number | null = null;
  try {
    const rows = await query<{ value: string }>(`select value from site_stats where key = 'visits'`);
    const parsed = rows[0] ? Number(rows[0].value) : 0;
    visits = Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    // таблицы может ещё не быть до миграции — оставляем null (неизвестно)
    console.error("admin/stats: запрос visits упал", err);
  }

  // null = сеть не ответила, клиент покажет «—». Ноль здесь означал бы «в
  // обороте ничего нет», а это совсем другое утверждение.
  const выпущено = ECOSYSTEM.token.totalSupply;
  let circulating: number | null = null;
  let burned: number | null = null;
  let vault: number | null = null;
  try {
    const [жетон, фонд] = await Promise.all([
      getJetton(ECOSYSTEM.token.master),
      getJettonBalance(ECOSYSTEM.rewardVault.address, ECOSYSTEM.token.master, ECOSYSTEM.token.decimals),
    ]);
    if (жетон) {
      circulating = жетон.totalSupply;
      // Сожжённое — разница между выпущенным и тем, что осталось в сети.
      // Отрицательная разница означала бы, что наши числа не сходятся с сетью:
      // тогда честнее не показывать ничего, чем показать минус.
      burned = жетон.totalSupply <= выпущено ? выпущено - жетон.totalSupply : null;
    }
    vault = фонд;
  } catch (err) {
    console.error("admin/stats: чтение из сети TON упало", err);
  }

  return Response.json({ ok: true, visits, circulating, burned, vault, initialSupply: выпущено });
}
