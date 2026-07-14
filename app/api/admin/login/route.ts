import {
  checkPassword,
  clientIpFromRequest,
  createSession,
  isIpLockedOut,
  recordLoginAttempt,
  requireAdminSecrets,
} from "../../../lib/adminAuth";
import { parseJson, adminLoginSchema } from "../../../lib/validation";

export async function POST(req: Request) {
  try {
    requireAdminSecrets();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Конфиг админки неполный";
    return Response.json({ ok: false, error: message }, { status: 503 });
  }

  const ip = clientIpFromRequest(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (await isIpLockedOut(ip)) {
    return Response.json(
      {
        ok: false,
        error: "Слишком много неверных попыток. Подожди 15 минут и попробуй снова.",
        locked: true,
      },
      { status: 429 },
    );
  }

  const parsed = await parseJson(req, adminLoginSchema);
  if (!parsed.ok) {
    await recordLoginAttempt(ip, false);
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }

  if (!checkPassword(parsed.data.password.trim())) {
    await recordLoginAttempt(ip, false);
    if (await isIpLockedOut(ip)) {
      return Response.json(
        {
          ok: false,
          error: "Слишком много неверных попыток. Подожди 15 минут и попробуй снова.",
          locked: true,
        },
        { status: 429 },
      );
    }
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }

  await recordLoginAttempt(ip, true);
  await createSession({ ip, userAgent });
  return Response.json({ ok: true });
}
