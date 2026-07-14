import { issueNonce, userAuthConfigError } from "../../../lib/userAuth";
import { parseJson, nonceRequestSchema } from "../../../lib/validation";
import {
  clientIp,
  hitAuthRateLimit,
  NONCE_MAX_PER_WINDOW,
} from "../../../lib/authRateLimit";

export async function POST(request: Request) {
  if (userAuthConfigError()) {
    return Response.json({ error: "Вход не настроен (SESSION_SECRET)" }, { status: 503 });
  }

  const ip = clientIp(request);
  try {
    const limited = await hitAuthRateLimit(`nonce:ip:${ip}`, NONCE_MAX_PER_WINDOW);
    if (!limited.ok) {
      return Response.json(
        { error: "Слишком много запросов. Подожди пару минут и попробуй снова." },
        { status: 429 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }

  const parsed = await parseJson(request, nonceRequestSchema);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { message, token } = issueNonce(parsed.data.wallet);
  return Response.json({ message, token });
}
