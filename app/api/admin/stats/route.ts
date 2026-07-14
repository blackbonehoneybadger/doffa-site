import { isAdminAuthed } from "../../../lib/auth";
import { getStats } from "../../../lib/statsStore";
import { userCount } from "../../../lib/userStore";
import { listVideos } from "../../../lib/videoStore";
import { REAL, fetchSupply } from "../../../solana";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  const [stats, users, videos] = await Promise.all([
    getStats(),
    userCount(),
    listVideos().catch(() => []),
  ]);

  let circulating: number | null = null;
  let burned: number | null = null;
  try {
    circulating = await fetchSupply();
    burned = Math.max(0, REAL.initialSupply - circulating);
  } catch {
    circulating = null;
    burned = null;
  }

  // Последние 14 дней посещений для мини-графика
  const days: { date: string; visits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, visits: stats.dailyVisits[key] ?? 0 });
  }

  return Response.json({
    ok: true,
    attendance: {
      totalVisits: stats.visits,
      uniqueToday: stats.uniqueToday,
      last14Days: days,
    },
    game: {
      opens: stats.gameOpens,
      downloads: stats.gameDownloads,
    },
    users,
    videos: {
      count: videos.length,
      todayIndex: videos.length
        ? Math.floor(Date.now() / 86_400_000) % videos.length
        : null,
    },
    tokens: {
      initialSupply: REAL.initialSupply,
      circulating,
      burned,
      awarded: stats.tokensAwarded,
      mint: REAL.mint,
    },
  });
}
