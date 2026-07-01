import { checkPassword, createSession } from "../../../lib/adminAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { password?: string } | null;
  const password = body?.password?.trim();
  if (!password || !checkPassword(password)) {
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
