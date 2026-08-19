import { issueNonce, userAuthConfigError } from "../../../lib/userAuth";
import { parseJson, nonceRequestSchema } from "../../../lib/validation";
import { crossOriginError } from "../../../lib/requestSecurity";

export async function POST(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;
  if (userAuthConfigError()) {
    return Response.json({ error: "Вход временно недоступен" }, { status: 503 });
  }

  const parsed = await parseJson(request, nonceRequestSchema);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }
  const { message, token } = issueNonce(parsed.data.wallet);
  return Response.json({ message, token });
}
