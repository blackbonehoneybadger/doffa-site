// Хранилище hero-видео в Vercel Blob. Список видео (метаданные) лежит одним
// JSON-файлом рядом с самими видео — здесь не нужна полноценная БД: одна
// кофейня, один список, максимум 10 записей.
import { put, del, list } from "@vercel/blob";

export const MAX_VIDEOS = 10;
const MANIFEST_PATH = "hero-videos/manifest.json";

export type HeroVideo = {
  id: string;
  url: string;
  pathname: string;
  uploadedAt: number;
};

/** Проверяет, что URL действительно указывает на Vercel Blob-хранилище, а путь
 *  лежит в нашей папке hero-videos/ (и это не сам манифест). Это не даёт
 *  зарегистрировать произвольный чужой URL через публичный клиентский POST. */
export function isValidBlobEntry(url: string, pathname: string): boolean {
  if (!pathname.startsWith("hero-videos/") || pathname === MANIFEST_PATH) return false;
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Превращает сырые ошибки Vercel Blob SDK в понятное сообщение для владельца. */
export function friendlyStorageError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("No blob credentials found") || raw.includes("BLOB_READ_WRITE_TOKEN")) {
    return "Хранилище видео не подключено. Зайди в Vercel → Storage → создай Blob-хранилище и подключи к проекту.";
  }
  return raw;
}

async function readManifest(): Promise<HeroVideo[]> {
  const { blobs } = await list({ prefix: MANIFEST_PATH, limit: 1 });
  const found = blobs.find((b) => b.pathname === MANIFEST_PATH);
  if (!found) return [];
  const res = await fetch(found.url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as HeroVideo[];
  return Array.isArray(data) ? data : [];
}

async function writeManifest(videos: HeroVideo[]): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(videos), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

/** Список загруженных hero-видео, от старых к новым. */
export async function listVideos(): Promise<HeroVideo[]> {
  return readManifest();
}

/** Регистрирует уже загруженный в Blob файл в манифесте. Кидает, если мест нет. */
export async function registerVideo(entry: { url: string; pathname: string }): Promise<HeroVideo[]> {
  const videos = await readManifest();
  if (videos.length >= MAX_VIDEOS) {
    throw new Error(`Уже загружено максимум (${MAX_VIDEOS}) видео. Сначала удали одно.`);
  }
  const next: HeroVideo[] = [
    ...videos,
    { id: crypto.randomUUID(), url: entry.url, pathname: entry.pathname, uploadedAt: Date.now() },
  ];
  await writeManifest(next);
  return next;
}

/** Удаляет видео из Blob и из манифеста. */
export async function deleteVideo(id: string): Promise<HeroVideo[]> {
  const videos = await readManifest();
  const target = videos.find((v) => v.id === id);
  if (!target) return videos;
  await del(target.url).catch(() => {
    // Файл мог быть уже удалён вручную — не блокируем чистку манифеста.
  });
  const next = videos.filter((v) => v.id !== id);
  await writeManifest(next);
  return next;
}

/**
 * Видео "на сегодня": детерминированная ротация по кругу без хранения
 * указателя — индекс считается от номера дня с начала эпохи. Каждый день
 * (по UTC) сдвигается на одно видео дальше, при добавлении/удалении видео
 * длина круга просто меняется на следующий день.
 */
export function pickTodayVideo(videos: HeroVideo[]): HeroVideo | null {
  if (videos.length === 0) return null;
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const index = dayNumber % videos.length;
  return videos[index];
}
