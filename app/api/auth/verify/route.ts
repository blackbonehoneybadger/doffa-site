import {
  verifyNonceToken,
  consumeNonce,
  createUserSession,
  userAuthConfigError,
} from "../../../lib/userAuth";
import { verifyWalletSignature } from "../../../lib/solanaAuth";
import { upsertUserLogin } from "../../../lib/users";
import { parseJson, verifyRequestSchema } from "../../../lib/validation";
import {
  clientIp,
  hitAuthRateLimit,
  VERIFY_IP_MAX_PER_WINDOW,
  VERIFY_WALLET_MAX_PER_WINDOW,
} from "../../../lib/authRateLimit";

export async function POST(request: Request) {
  if (userAuthConfigError()) {
    return Response.json({ error: "Вход не настроен (SESSION_SECRET)" }, { status: 503 });
  }

  const parsed = await parseJson(request, verifyRequestSchema);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const ip = clientIp(request);
  try {
    const ipLimit = await hitAuthRateLimit(`verify:ip:${ip}`, VERIFY_IP_MAX_PER_WINDOW);
    if (!ipLimit.ok) {
      return Response.json(
        { error: "Слишком много попыток входа. Подожди пару минут." },
        { status: 429 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }

  const nonce = verifyNonceToken(body.token);
  if (!nonce) {
    return Response.json({ error: "Код устарел, попробуй войти заново" }, { status: 401 });
  }

  try {
    const walletLimit = await hitAuthRateLimit(
      `verify:wallet:${nonce.wallet}`,
      VERIFY_WALLET_MAX_PER_WINDOW,
    );
    if (!walletLimit.ok) {
      return Response.json(
        { error: "Слишком много попыток для этого кошелька. Подожди пару минут." },
        { status: 429 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }

  if (!verifyWalletSignature(nonce.message, body.signature, nonce.wallet)) {
    return Response.json({ error: "Подпись не совпадает с кошельком" }, { status: 401 });
  }

  try {
    // Одноразовость: если этот nonce уже был потрачен — это повтор, отклоняем.
    const fresh = await consumeNonce(nonce.nonce, nonce.exp);
    if (!fresh) {
      return Response.json({ error: "Код уже использован, войди заново" }, { status: 401 });
    }
    const user = await upsertUserLogin(nonce.wallet);
    await createUserSession(nonce.wallet, request.headers.get("user-agent") ?? undefined);
    return Response.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }
}
