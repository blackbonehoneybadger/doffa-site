import { listVideos, deleteVideo, registerVideo, friendlyStorageError, isValidBlobEntry, MAX_VIDEOS } from "../../../lib/videoStore";
import { parseJson, videoRegisterSchema } from "../../../lib/validation";
import { requireAdminApi } from "../../../lib/adminApi";
import { crossOriginError } from "../../../lib/requestSecurity";
import { reportServerError } from "../../../lib/serverError";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;
  try {
    const videos = await listVideos();
    return Response.json({ ok: true, videos, max: MAX_VIDEOS });
  } catch (err) {
    reportServerError("admin video list failed", err);
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 503 });
  }
}

// Клиент вызывает это сразу после того, как upload() из @vercel/blob/client
// завершился успешно — регистрирует уже загруженный файл в манифесте.
export async function POST(req: Request) {
  const originError = crossOriginError(req);
  if (originError) return originError;
  const authError = await requireAdminApi();
  if (authError) return authError;
  const parsed = await parseJson(req, videoRegisterSchema);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
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
    reportServerError("admin video registration failed", err);
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const originError = crossOriginError(req);
  if (originError) return originError;
  const authError = await requireAdminApi();
  if (authError) return authError;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ ok: false, error: "id не указан" }, { status: 400 });
  }
  try {
    const videos = await deleteVideo(id);
    return Response.json({ ok: true, videos });
  } catch (err) {
    reportServerError("admin video deletion failed", err);
    return Response.json({ ok: false, error: friendlyStorageError(err) }, { status: 503 });
  }
}
