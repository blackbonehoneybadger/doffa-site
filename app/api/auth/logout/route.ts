import { destroyUserSession } from "../../../lib/auth";

export async function POST() {
  await destroyUserSession();
  return Response.json({ ok: true });
}
