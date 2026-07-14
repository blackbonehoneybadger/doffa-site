import { requireUser } from "../../lib/auth";
import {
  countReferrals,
  listReferralUsernames,
  findById,
} from "../../lib/userStore";
import { nextReward, unlockedRewards } from "../../lib/rewards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  // Поиск других пользователей — только для авторизованных
  if (q) {
    const { searchUsers } = await import("../../lib/userStore");
    const results = await searchUsers(q, 15);
    return Response.json({
      ok: true,
      results: results.map((u) => ({
        username: u.username,
        referralCount: u.referralCount,
        createdAt: u.createdAt,
      })),
    });
  }

  const user = await findById(session.id);
  if (!user) {
    return Response.json({ ok: false, error: "Пользователь не найден" }, { status: 404 });
  }

  const referralCount = await countReferrals(user.id);
  const referrals = await listReferralUsernames(user.id);
  const unlocked = unlockedRewards(referralCount);
  const next = nextReward(referralCount);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      referralCount,
    },
    referralLink: `${origin}/register?ref=${user.referralCode}`,
    referrals,
    rewards: {
      unlocked,
      next,
    },
  });
}
