import { listVideos, pickTodayVideo } from "../../lib/videoStore";

// Публичный эндпоинт — отдаёт URL сегодняшнего hero-видео (ротация по кругу).
// Если владелец кофейни ещё ничего не загрузил — возвращаем null, и сайт
// показывает дефолтное видео из /public/brand/hero.mp4.
export async function GET() {
  try {
    const videos = await listVideos();
    const today = pickTodayVideo(videos);
    return Response.json(
      { ok: true, url: today?.url ?? null },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ ok: true, url: null });
  }
}
