import { currentWallet } from "../../lib/userAuth";
import { getUser, updateProfile, getLoyalty } from "../../lib/users";
import { parseJson, profilePatchSchema } from "../../lib/validation";
import { crossOriginError } from "../../lib/requestSecurity";
import { reportServerError } from "../../lib/serverError";

export async function GET() {
  try {
    const wallet = await currentWallet();
    if (!wallet) {
      return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
    }
    const [user, loyalty] = await Promise.all([getUser(wallet), getLoyalty(wallet)]);
    return Response.json({ ok: true, user, loyalty });
  } catch (err) {
    reportServerError("profile read failed", err);
    return Response.json(
      { ok: false, error: "Профиль временно недоступен" },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const originError = crossOriginError(request);
  if (originError) return originError;

  try {
    const wallet = await currentWallet();
    if (!wallet) {
      return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
    }

    const parsed = await parseJson(request, profilePatchSchema);
    if (!parsed.ok) {
      return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const user = await updateProfile(wallet, { nickname: parsed.data.nickname });
    return Response.json({ ok: true, user });
  } catch (err) {
    reportServerError("profile update failed", err);
    return Response.json(
      { ok: false, error: "Не удалось обновить профиль" },
      { status: 503 },
    );
  }
}
