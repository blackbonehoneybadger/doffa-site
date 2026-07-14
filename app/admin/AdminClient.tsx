"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { HeroVideo } from "../lib/videoStore";

const MAX_VIDEOS = 10;
const MAX_FILE_MB = 40;
/** Короткий ролик для hero — не длиннее 60 секунд. */
const MAX_DURATION_SEC = 60;

type AdminStats = {
  visitors: number;
  circulating: number | null;
  burned: number | null;
  initialSupply: number;
  videoCount: number;
};

export default function AdminClient({ initialAuthed }: { initialAuthed: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-gold/80">Владелец</p>
      <h1 className="display mt-2 text-3xl font-extrabold text-cream-soft">DOFFA · Админ</h1>
      <p className="mt-2 text-sm text-cream/60">
        Статистика сайта и архив видео для главной. Каждый день сайт показывает следующее видео
        по кругу; если новых нет — идёт по уже загруженным.
      </p>
      <div className="mt-8">
        {authed ? <Dashboard onLoggedOut={() => setAuthed(false)} /> : <LoginForm onSuccess={() => setAuthed(true)} />}
      </div>
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
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <label className="block text-sm font-semibold text-cream-soft">Пароль владельца</label>
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
        {loading ? "Проверяю…" : "Войти в админку"}
      </button>
      <p className="mt-4 text-center text-xs text-cream/40">
        Пользовательский кабинет — отдельно:{" "}
        <a href="/profile" className="text-gold/80 underline hover:text-gold">
          /profile
        </a>
      </p>
    </form>
  );
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("ru-RU");
}

function Dashboard({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setStats({
            visitors: data.visitors ?? 0,
            circulating: data.circulating,
            burned: data.burned,
            initialSupply: data.initialSupply ?? 100_000_000,
            videoCount: data.videoCount ?? 0,
          });
        } else {
          setStatsError(data.error ?? "Не удалось загрузить статистику");
        }
      })
      .catch(() => {
        if (!cancelled) setStatsError("Не удалось связаться с сервером");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onLoggedOut();
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cream-soft">Сводка</h2>
        <button onClick={logout} className="text-xs text-cream/50 underline hover:text-cream">
          Выйти
        </button>
      </div>

      {statsError && <p className="text-sm text-red-400">{statsError}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Заходили на сайт" value={stats ? formatNum(stats.visitors) : "…"} hint="Сессии (раз за визит браузера)" />
        <Stat label="В обороте $DOFFA" value={stats ? formatNum(stats.circulating) : "…"} hint="Текущий supply on-chain" />
        <Stat label="Сожжено $DOFFA" value={stats ? formatNum(stats.burned) : "…"} hint="Эмиссия − текущий supply" />
      </div>

      <UploadPanel />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-xs uppercase tracking-wider text-cream/45">{label}</p>
      <p className="mt-2 display text-2xl font-extrabold text-gold">{value}</p>
      <p className="mt-1 text-[11px] text-cream/35">{hint}</p>
    </div>
  );
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const d = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(d)) reject(new Error("Не удалось прочитать длительность видео"));
      else resolve(d);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Файл не читается как видео"));
    };
    video.src = url;
  });
}

function UploadPanel() {
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
    try {
      const duration = await readDuration(file);
      if (duration > MAX_DURATION_SEC + 0.5) {
        setError(`Видео длиннее ${MAX_DURATION_SEC} сек (${Math.round(duration)} с). Сожми до минуты.`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось проверить длительность");
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
    <section>
      <h2 className="text-lg font-semibold text-cream-soft">Видео на главной</h2>
      <p className="mt-1 text-sm text-cream/55">
        Короткий ролик до {MAX_DURATION_SEC} секунд. Ротация: каждый день следующее из архива по кругу.
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-cream/60">
          В архиве: <span className="font-bold text-cream-soft">{count}</span> / {MAX_VIDEOS}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <label className="block text-sm font-semibold text-cream-soft">Загрузить видео</label>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={uploading || full}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="mt-3 block w-full text-sm text-cream/70 file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-5 file:py-2.5 file:font-bold file:text-ink disabled:opacity-40"
        />
        {full && (
          <p className="mt-3 text-sm text-amber">
            Достигнут лимит в {MAX_VIDEOS} видео — удали одно, чтобы загрузить новое.
          </p>
        )}
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
                <p className="truncate text-sm text-cream-soft">
                  #{i + 1} · {new Date(v.uploadedAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <button
                onClick={() => void handleDelete(v.id)}
                className="shrink-0 rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-400 transition hover:bg-red-400/10"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
