import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyStorageError, isValidBlobEntry } from "../app/lib/videoStore";

const HOST = "abc-123.public.blob.vercel-storage.com";

test("isValidBlobEntry: принимает только точный HTTPS Blob URL и video path", () => {
  assert.equal(
    isValidBlobEntry(
      `https://${HOST}/hero-videos/intro-random.mp4`,
      "hero-videos/intro-random.mp4",
    ),
    true,
  );
});

test("isValidBlobEntry: отклоняет host spoofing, http, query и несовпадение пути", () => {
  assert.equal(
    isValidBlobEntry(
      "https://evilpublic.blob.vercel-storage.com/hero-videos/a.mp4",
      "hero-videos/a.mp4",
    ),
    false,
  );
  assert.equal(
    isValidBlobEntry(`http://${HOST}/hero-videos/a.mp4`, "hero-videos/a.mp4"),
    false,
  );
  assert.equal(
    isValidBlobEntry(`https://${HOST}/hero-videos/a.mp4?token=x`, "hero-videos/a.mp4"),
    false,
  );
  assert.equal(
    isValidBlobEntry(`https://${HOST}/hero-videos/b.mp4`, "hero-videos/a.mp4"),
    false,
  );
});

test("isValidBlobEntry: манифест и не-видео зарегистрировать нельзя", () => {
  assert.equal(
    isValidBlobEntry(`https://${HOST}/hero-videos/manifest.json`, "hero-videos/manifest.json"),
    false,
  );
  assert.equal(
    isValidBlobEntry(`https://${HOST}/hero-videos/payload.html`, "hero-videos/payload.html"),
    false,
  );
});

test("friendlyStorageError: не возвращает наружу произвольный сырой текст SDK", () => {
  const raw = "postgres://user:super-secret@db.example/internal";
  assert.equal(friendlyStorageError(new Error(raw)), "Хранилище видео временно недоступно");
  assert.equal(friendlyStorageError(new Error(raw)).includes("super-secret"), false);
});
