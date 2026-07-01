import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAuthed } from "../../../lib/adminAuth";
import { friendlyStorageError } from "../../../lib/videoStore";

// Выдаёт клиенту одноразовый токен на загрузку файла напрямую в Vercel Blob,
// минуя serverless-функцию (у неё лимит на размер тела запроса — видео через
// неё не прошло бы). Здесь только проверяем права и ограничения на файл.
export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
        addRandomSuffix: true,
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 МБ с запасом на телефонные видео
      }),
      onUploadCompleted: async () => {
        // Ничего не делаем здесь — клиент сам регистрирует файл через
        // POST /api/admin/videos сразу после того, как upload() резолвится.
        // Так работает одинаково и в проде, и в локальной разработке
        // (вебхук onUploadCompleted недоступен на localhost).
      },
    });
    return Response.json(jsonResponse);
  } catch (err) {
    return Response.json({ error: friendlyStorageError(err) }, { status: 400 });
  }
}
