import {
  verifyNonceToken,
  consumeNonce,
  createUserSession,
  userAuthConfigError,
} from "../../../lib/userAuth";
import { verifyWalletSignature } from "../../../lib/solanaAuth";
import { upsertUserLogin } from "../../../lib/users";
import { parseJson, verifyRequestSchema } from "../../../lib/validation";
import { crossOriginError } from "../../../lib/requestSecurity";
import { reportServerError } from "../../../lib/serverError";

export async function POST(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;
  if (userAuthConfigError()) {
    return Response.json({ error: "Вход временно недоступен" }, { status: 503 });
  }

  const parsed = await parseJson(request, verifyRequestSchema);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.data;

  const nonce = verifyNonceToken(body.token);
  if (!nonce) {
    return Response.json({ error: "Код устарел, попробуй войти заново" }, { status: 401 });
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
    reportServerError("wallet auth verify failed", err);
    return Response.json({ error: "Вход временно недоступен" }, { status: 503 });
  }
}
