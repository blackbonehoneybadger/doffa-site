import { isAuthed } from "../../../lib/adminAuth";
import { listVideos, deleteVideo, registerVideo, friendlyStorageError, MAX_VIDEOS } from "../../../lib/videoStore";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }
  try {
    const videos = await listVideos();
    return Response.json({ ok: true, videos, max: MAX_VIDEOS });
  } catch (err) {
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 503 });
  }
}

// Клиент вызывает это сразу после того, как upload() из @vercel/blob/client
// завершился успешно — регистрирует уже загруженный файл в манифесте.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as {
    url?: string;
    pathname?: string;
    durationSeconds?: number;
  } | null;
  if (!body?.url || !body?.pathname) {
    return Response.json({ ok: false, error: "url/pathname не указаны" }, { status: 400 });
  }
  // Принимаем только файлы из нашей же папки hero-videos/ — защита от регистрации
  // произвольных чужих Blob-URL через этот эндпоинт.
  if (!body.pathname.startsWith("hero-videos/") || body.pathname === "hero-videos/manifest.json") {
    return Response.json({ ok: false, error: "Недопустимый путь файла" }, { status: 400 });
  }
  try {
    const videos = await registerVideo({
      url: body.url,
      pathname: body.pathname,
      durationSeconds: body.durationSeconds,
    });
    return Response.json({ ok: true, videos });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : friendlyStorageError(err) },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ ok: false, error: "id не указан" }, { status: 400 });
  }
  try {
    const videos = await deleteVideo(id);
    return Response.json({ ok: true, videos });
  } catch (err) {
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 503 });
  }
}
