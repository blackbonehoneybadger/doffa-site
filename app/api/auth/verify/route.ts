import { verifyNonceToken, createUserSession } from "../../../lib/userAuth";
import { verifyWalletSignature } from "../../../lib/solanaAuth";
import { upsertUserLogin } from "../../../lib/users";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string; signature?: string } | null;
  if (!body?.token || !body?.signature) {
    return Response.json({ error: "Не хватает данных" }, { status: 400 });
  }

  const nonce = verifyNonceToken(body.token);
  if (!nonce) {
    return Response.json({ error: "Код устарел, попробуй войти заново" }, { status: 401 });
  }

  if (!verifyWalletSignature(nonce.message, body.signature, nonce.wallet)) {
    return Response.json({ error: "Подпись не совпадает с кошельком" }, { status: 401 });
  }

  try {
    const user = await upsertUserLogin(nonce.wallet);
    await createUserSession(nonce.wallet);
    return Response.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }
}
