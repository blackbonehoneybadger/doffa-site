import {
  checkAdminPassword,
  createLegacyAdminSession,
  createUserSession,
} from "../../../lib/auth";
import { authenticate } from "../../../lib/userStore";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const password = body?.password?.trim();
  if (!password) {
    return Response.json({ ok: false, error: "Укажи пароль" }, { status: 400 });
  }

  const username = body?.username?.trim();

  // Полноценный вход по логину + паролю
  if (username) {
    const user = await authenticate(username, password);
    if (!user) {
      return Response.json({ ok: false, error: "Неверный логин или пароль" }, { status: 401 });
    }
    await createUserSession(user.id, user.role);
    return Response.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  }

  // Совместимость: старый вход только паролем админа (без логина)
  if (checkAdminPassword(password)) {
    await createLegacyAdminSession();
    return Response.json({
      ok: true,
      user: { id: "legacy-admin", username: "admin", role: "admin", referralCode: "" },
      legacy: true,
    });
  }

  return Response.json({ ok: false, error: "Неверный логин или пароль" }, { status: 401 });
}
