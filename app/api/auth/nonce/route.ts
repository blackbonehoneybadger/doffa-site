import { issueNonce } from "../../../lib/userAuth";

// Простая проверка формы base58-адреса Solana (без декодирования — достаточно
// отсечь мусор до подписи; настоящая проверка ключа идёт в /api/auth/verify).
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { wallet?: string } | null;
  const wallet = body?.wallet?.trim();
  if (!wallet || !WALLET_RE.test(wallet)) {
    return Response.json({ error: "Некорректный адрес кошелька" }, { status: 400 });
  }
  const { message, token } = issueNonce(wallet);
  return Response.json({ message, token });
}
