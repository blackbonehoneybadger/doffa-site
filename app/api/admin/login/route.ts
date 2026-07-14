import { checkPassword, createSession } from "../../../lib/adminAuth";
import { parseJson, adminLoginSchema } from "../../../lib/validation";

export async function POST(req: Request) {
  const parsed = await parseJson(req, adminLoginSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }
  if (!checkPassword(parsed.data.password.trim())) {
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
