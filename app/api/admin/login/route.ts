import {
  checkAdminPassword,
  createLegacyAdminSession,
  createUserSession,
} from "../../../lib/auth";
import { authenticate } from "../../../lib/userStore";

/** Вход в /admin: логин+пароль админа, либо только пароль (legacy). */
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
  if (username) {
    const user = await authenticate(username, password);
    if (!user || user.role !== "admin") {
      return Response.json({ ok: false, error: "Нет доступа администратора" }, { status: 401 });
    }
    await createUserSession(user.id, user.role);
    return Response.json({ ok: true, user: { username: user.username, role: user.role } });
  }

  if (checkAdminPassword(password)) {
    await createLegacyAdminSession();
    return Response.json({ ok: true, legacy: true });
  }

  return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
}
