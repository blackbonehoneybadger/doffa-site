import { destroySession } from "../../../lib/adminAuth";
import { crossOriginError } from "../../../lib/requestSecurity";

export async function POST(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;
  await destroySession();
  return Response.json({ ok: true });
}
