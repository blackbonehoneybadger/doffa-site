import { getSessionUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ ok: true, user: null });
  }
  return Response.json({ ok: true, user });
}
