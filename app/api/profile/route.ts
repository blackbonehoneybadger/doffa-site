import { currentWallet } from "../../lib/userAuth";
import { getUser, updateProfile, getLoyalty } from "../../lib/users";
import { parseJson, profilePatchSchema } from "../../lib/validation";

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
  const parsed = await parseJson(request, profilePatchSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  try {
    const user = await updateProfile(wallet, { nickname: parsed.data.nickname });
    return Response.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
