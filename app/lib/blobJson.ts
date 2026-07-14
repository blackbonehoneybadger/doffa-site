// Общий хелпер: JSON-манифест в Vercel Blob (прод) с локальным fallback
// в `.data/` — чтобы регистрация и статистика работали и без Blob-токена.
import { put, list } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function localPath(blobPath: string): string {
  return path.join(process.cwd(), ".data", blobPath);
}

export async function readJsonBlob<T>(blobPath: string, fallback: T): Promise<T> {
  if (hasBlob()) {
    try {
      const { blobs } = await list({ prefix: blobPath, limit: 5 });
      const found = blobs.find((b) => b.pathname === blobPath);
      if (!found) return fallback;
      const res = await fetch(found.url, { cache: "no-store" });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  }

  try {
    const raw = await readFile(localPath(blobPath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonBlob<T>(blobPath: string, data: T): Promise<void> {
  const body = JSON.stringify(data, null, 0);

  if (hasBlob()) {
    await put(blobPath, body, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });
    return;
  }

  const full = localPath(blobPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body, "utf8");
}
