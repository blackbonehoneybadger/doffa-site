import { isAuthed } from "../../../lib/adminAuth";
import { listVideos, deleteVideo, registerVideo, friendlyStorageError, isValidBlobEntry, MAX_VIDEOS } from "../../../lib/videoStore";
import { parseJson, videoRegisterSchema } from "../../../lib/validation";

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
  const parsed = await parseJson(req, videoRegisterSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  // Принимаем только файлы из нашей папки hero-videos/ на нашем же Blob-хосте —
  // защита от регистрации произвольных чужих URL через этот эндпоинт.
  if (!isValidBlobEntry(parsed.data.url, parsed.data.pathname)) {
    return Response.json({ ok: false, error: "Недопустимый путь или адрес файла" }, { status: 400 });
  }
  try {
    const videos = await registerVideo({ url: parsed.data.url, pathname: parsed.data.pathname });
    return Response.json({ ok: true, videos });
  } catch (err) {
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 400 });
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
