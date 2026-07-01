import { destroySession } from "../../../lib/adminAuth";

export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}
