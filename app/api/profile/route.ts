import { currentWallet } from "../../lib/userAuth";
import { getUser, updateProfile, getLoyalty } from "../../lib/users";

export async function GET() {
  const wallet = await currentWallet();
  if (!wallet) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }
  try {
    const [user, loyalty] = await Promise.all([getUser(wallet), getLoyalty(wallet)]);
    return Response.json({ ok: true, user, loyalty });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const wallet = await currentWallet();
  if (!wallet) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { nickname?: string } | null;
  const nickname = body?.nickname?.trim().slice(0, 40);
  if (!nickname) {
    return Response.json({ ok: false, error: "Нечего сохранять" }, { status: 400 });
  }
  try {
    const user = await updateProfile(wallet, { nickname });
    return Response.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
