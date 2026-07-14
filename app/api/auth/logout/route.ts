import { destroyUserSession } from "../../../lib/userAuth";

export async function POST() {
  await destroyUserSession();
  return Response.json({ ok: true });
}
