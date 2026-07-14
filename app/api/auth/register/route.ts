import { createUserSession } from "../../../lib/auth";
import { registerUser } from "../../../lib/userStore";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    password?: string;
    role?: "admin" | "user";
    inviteCode?: string;
    referralCode?: string;
  } | null;

  if (!body?.username || !body?.password) {
    return Response.json({ ok: false, error: "Укажи логин и пароль" }, { status: 400 });
  }

  const result = await registerUser({
    username: body.username,
    password: body.password,
    role: body.role === "admin" ? "admin" : "user",
    inviteCode: body.inviteCode,
    referralCode: body.referralCode,
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  await createUserSession(result.user.id, result.user.role);
  return Response.json({ ok: true, user: result.user });
}
