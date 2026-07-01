"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { HeroVideo } from "../lib/videoStore";

const MAX_VIDEOS = 10;
const MAX_FILE_MB = 200;

export default function AdminClient({ initialAuthed }: { initialAuthed: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <h1 className="display text-3xl font-extrabold text-cream-soft">DOFFA · Видео на главной</h1>
      <p className="mt-2 text-sm text-cream/60">
        Загружай видео для главной страницы сайта. Каждый день сайт автоматически показывает
        следующее по кругу — когда доходит до последнего, начинает сначала.
      </p>
      <div className="mt-8">{authed ? <UploadPanel onLoggedOut={() => setAuthed(false)} /> : <LoginForm onSuccess={() => setAuthed(true)} />}</div>
    </main>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось войти");
        return;
      }
      onSuccess();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card rounded-2xl p-6">
      <label className="block text-sm font-semibold text-cream-soft">Пароль</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
        placeholder="••••••••"
      />
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="mt-5 w-full rounded-full bg-gold px-6 py-3 font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Проверяю…" : "Войти"}
      </button>
    </form>
  );
}

function UploadPanel({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [videos, setVideos] = useState<HeroVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/videos")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setVideos(data.videos);
        } else {
          setVideos([]);
          setError(data.error ?? "Не удалось загрузить список видео");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideos([]);
          setError("Не удалось связаться с сервером");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onLoggedOut();
  }

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("video/")) {
      setError("Нужен видеофайл (mp4, webm или mov).");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Файл слишком большой (максимум ${MAX_FILE_MB} МБ).`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const blob = await upload(`hero-videos/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload-token",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, pathname: blob.pathname }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось сохранить видео");
        return;
      }
      setVideos(data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить это видео?")) return;
    setError(null);
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.ok) {
      setVideos(data.videos);
    } else {
      setError(data.error ?? "Не удалось удалить видео");
    }
  }

  const count = videos?.length ?? 0;
  const full = count >= MAX_VIDEOS;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-cream/60">
          Загружено: <span className="font-bold text-cream-soft">{count}</span> / {MAX_VIDEOS}
        </span>
        <button onClick={logout} className="text-xs text-cream/50 underline hover:text-cream">
          Выйти
        </button>
      </div>

      <div className="mt-5 card rounded-2xl p-6">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={uploading || full}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm text-cream/70 file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-5 file:py-2.5 file:font-bold file:text-ink disabled:opacity-40"
        />
        {full && <p className="mt-3 text-sm text-amber">Достигнут лимит в {MAX_VIDEOS} видео — удали одно, чтобы загрузить новое.</p>}
        {uploading && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-cream/50">Загрузка… {progress}%</p>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="mt-6 space-y-3">
        {videos === null ? (
          <p className="text-sm text-cream/50">Загружаю список…</p>
        ) : videos.length === 0 ? (
          <p className="text-sm text-cream/50">Видео ещё не загружены — на сайте крутится дефолтное.</p>
        ) : (
          videos.map((v, i) => (
            <div key={v.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <video src={v.url} muted className="h-16 w-28 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cream-soft">#{i + 1} · {new Date(v.uploadedAt).toLocaleDateString("ru-RU")}</p>
              </div>
              <button onClick={() => handleDelete(v.id)} className="shrink-0 rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-400 transition hover:bg-red-400/10">
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
