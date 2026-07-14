import { cookies } from "next/headers";
import { trackEvent, type TrackEvent } from "../../lib/statsStore";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "doffa_vid";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { event?: string } | null;
  const event = body?.event as TrackEvent | undefined;
  if (event !== "visit" && event !== "game_open" && event !== "game_download") {
    return Response.json({ ok: false, error: "Неизвестное событие" }, { status: 400 });
  }

  const store = await cookies();
  let visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    store.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const stats = await trackEvent(event, visitorId);
  return Response.json({
    ok: true,
    visits: stats.visits,
    gameOpens: stats.gameOpens,
    gameDownloads: stats.gameDownloads,
  });
}
