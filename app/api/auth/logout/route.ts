import { destroyUserSession } from "../../../lib/userAuth";
import { crossOriginError } from "../../../lib/requestSecurity";

export async function POST(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;
  await destroyUserSession();
  return Response.json({ ok: true });
}
