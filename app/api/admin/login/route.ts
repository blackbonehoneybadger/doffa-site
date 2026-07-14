import {
  checkPassword,
  createSession,
  isLockedOut,
  recordFailure,
  clearFailures,
  adminConfigError,
} from "../../../lib/adminAuth";
import { parseJson, adminLoginSchema } from "../../../lib/validation";

// Клиентский IP из заголовков прокси (Vercel проставляет x-forwarded-for).
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  if (adminConfigError()) {
    return Response.json({ ok: false, error: "Админка не настроена" }, { status: 503 });
  }

  const ip = clientIp(req);
  if (await isLockedOut(ip)) {
    return Response.json(
      { ok: false, error: "Слишком много попыток. Попробуй через 15 минут." },
      { status: 429 },
    );
  }

  const parsed = await parseJson(req, adminLoginSchema);
  if (!parsed.ok || !checkPassword(parsed.data.password.trim())) {
    await recordFailure(ip);
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }

  await clearFailures(ip);
  await createSession(ip, req.headers.get("user-agent") ?? undefined);
  return Response.json({ ok: true });
}
