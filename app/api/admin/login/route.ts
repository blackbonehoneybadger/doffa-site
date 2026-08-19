import {
  checkPassword,
  createSession,
  isLockedOut,
  recordFailure,
  clearFailures,
  adminConfigError,
} from "../../../lib/adminAuth";
import { parseJson, adminLoginSchema } from "../../../lib/validation";
import { clientIp, crossOriginError } from "../../../lib/requestSecurity";
import { reportServerError } from "../../../lib/serverError";

export async function POST(req: Request) {
  const originError = crossOriginError(req);
  if (originError) return originError;

  if (adminConfigError()) {
    return Response.json({ ok: false, error: "Админка не настроена" }, { status: 503 });
  }

  const parsed = await parseJson(req, adminLoginSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const ip = clientIp(req);
  try {
    if (await isLockedOut(ip)) {
      return Response.json(
        { ok: false, error: "Слишком много попыток. Попробуй через 15 минут." },
        { status: 429 },
      );
    }

    if (!checkPassword(parsed.data.password.trim())) {
      await recordFailure(ip);
      return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
    }

    await clearFailures(ip);
    await createSession(ip, req.headers.get("user-agent") ?? undefined);
    return Response.json({ ok: true });
  } catch (error) {
    reportServerError("admin login failed", error);
    return Response.json(
      { ok: false, error: "Сервис временно недоступен" },
      { status: 503 },
    );
  }
}
