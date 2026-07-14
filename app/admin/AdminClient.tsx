"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { HeroVideo } from "../lib/videoStore";

const MAX_VIDEOS = 10;
const MAX_FILE_MB = 200;
const MAX_DURATION_SECONDS = 60;

type AdminStats = {
  attendance: {
    totalVisits: number;
    uniqueToday: number;
    last14Days: { date: string; visits: number }[];
  };
  game: { opens: number; downloads: number };
  users: { total: number; admins: number; users: number };
  videos: { count: number; todayIndex: number | null };
  tokens: {
    initialSupply: number;
    circulating: number | null;
    burned: number | null;
    awarded: number;
    mint: string | null;
  };
};

export default function AdminClient({ initialAuthed }: { initialAuthed: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [tab, setTab] = useState<"stats" | "videos">("stats");

  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(197,164,110,0.14),_transparent_70%)]"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber">DOFFA · ADMIN</p>
      <h1 className="display mt-3 text-3xl font-extrabold text-cream-soft sm:text-4xl">
        Панель администратора
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/60">
        Загрузка коротких роликов на главную (до {MAX_DURATION_SECONDS} сек), ротация раз в день,
        статистика посещений, игры и токена.
      </p>

      {!authed ? (
        <div className="mt-8">
          <LoginForm onSuccess={() => setAuthed(true)} />
          <p className="mt-6 text-center text-sm text-cream/45">
            Нет аккаунта админа?{" "}
            <Link href="/register" className="text-gold hover:text-amber">
              Зарегистрировать с кодом приглашения
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(
                [
                  ["stats", "Статистика"],
                  ["videos", "Видео"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === id
                      ? "bg-gold text-ink"
                      : "border border-white/15 text-cream/70 hover:border-gold hover:text-gold"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <LogoutButton onLoggedOut={() => setAuthed(false)} />
          </div>
          <div className="mt-6">
            {tab === "stats" ? <StatsPanel /> : <UploadPanel />}
          </div>
        </div>
      )}

      <p className="mt-12 text-center text-sm text-cream/40">
        <Link href="/" className="hover:text-gold">
          ← На главную
        </Link>
      </p>
    </main>
  );
}

function LogoutButton({ onLoggedOut }: { onLoggedOut: () => void }) {
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        onLoggedOut();
      }}
      className="text-xs text-cream/50 underline hover:text-cream"
    >
      Выйти
    </button>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({
          username: username.trim() || undefined,
          password,
        }),
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
      <label className="block text-sm font-semibold text-cream-soft">Логин</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-cream-soft outline-none focus:border-gold"
        placeholder="admin (или оставь пустым для старого пароля)"
      />
      <label className="mt-4 block text-sm font-semibold text-cream-soft">Пароль</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        autoComplete="current-password"
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

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cream/45">{label}</p>
      <p className="display mt-2 text-2xl font-extrabold text-cream-soft">{value}</p>
      {hint && <p className="mt-1 text-xs text-cream/40">{hint}</p>}
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) {
          setError(d.error ?? "Не удалось загрузить статистику");
          return;
        }
        setStats(d);
      })
      .catch(() => {
        if (!cancelled) setError("Ошибка сети");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!stats) return <p className="text-sm text-cream/50">Считаю статистику…</p>;

  const maxDay = Math.max(1, ...stats.attendance.last14Days.map((d) => d.visits));
  const fmt = (n: number | null) =>
    n === null || n === undefined ? "—" : n.toLocaleString("ru-RU");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="display text-lg font-bold text-cream-soft">Посещаемость</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Визиты всего" value={fmt(stats.attendance.totalVisits)} />
          <StatTile label="Уникальные сегодня" value={fmt(stats.attendance.uniqueToday)} />
          <StatTile label="Пользователи" value={fmt(stats.users.users)} hint={`${stats.users.admins} админ(ов)`} />
        </div>
        <div className="mt-4 flex h-24 items-end gap-1 rounded-xl border border-white/10 bg-black/20 p-3">
          {stats.attendance.last14Days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-sm bg-gradient-to-t from-gold/80 to-amber/50 transition-all"
                style={{ height: `${Math.max(4, (d.visits / maxDay) * 100)}%` }}
                title={`${d.date}: ${d.visits}`}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-cream/40">Визиты за последние 14 дней (UTC)</p>
      </section>

      <section>
        <h2 className="display text-lg font-bold text-cream-soft">Игра</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatTile label="Открытий в браузере" value={fmt(stats.game.opens)} />
          <StatTile label="Скачиваний" value={fmt(stats.game.downloads)} hint="браузер + APK" />
        </div>
      </section>

      <section>
        <h2 className="display text-lg font-bold text-cream-soft">$DOFFA</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Сожжено" value={fmt(stats.tokens.burned)} />
          <StatTile label="В обороте" value={fmt(stats.tokens.circulating)} />
          <StatTile label="Выдано (учёт)" value={fmt(stats.tokens.awarded)} />
        </div>
        <p className="mt-2 text-xs text-cream/40">
          Эмиссия {fmt(stats.tokens.initialSupply)} · сожжено = эмиссия − supply on-chain
        </p>
      </section>

      <section>
        <h2 className="display text-lg font-bold text-cream-soft">Видео на главной</h2>
        <p className="mt-2 text-sm text-cream/60">
          В ротации: <span className="font-semibold text-cream-soft">{stats.videos.count}</span>
          {stats.videos.todayIndex !== null && (
            <>
              {" "}
              · сегодня играет #{stats.videos.todayIndex + 1}
            </>
          )}
        </p>
      </section>
    </div>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration)) {
        reject(new Error("Не удалось прочитать длительность видео"));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть видеофайл"));
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

    let durationSeconds: number;
    try {
      durationSeconds = await readVideoDuration(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка чтения видео");
      return;
    }
    if (durationSeconds > MAX_DURATION_SECONDS + 0.5) {
      setError(
        `Ролик ${Math.round(durationSeconds)} сек — слишком длинный. Максимум ${MAX_DURATION_SECONDS} сек (Shorts / Reels / TikTok).`,
      );
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
        body: JSON.stringify({
          url: blob.url,
          pathname: blob.pathname,
          durationSeconds: Math.round(durationSeconds),
        }),
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
  const todayIndex =
    count > 0 ? Math.floor(Date.now() / 86_400_000) % count : null;

  return (
    <div>
      <p className="text-sm text-cream/60">
        Загружай 1–4 коротких ролика в день. Сайт каждый день берёт следующее видео из очереди.
        Формат — как Shorts / Reels / TikTok, не длиннее{" "}
        <span className="text-cream-soft">{MAX_DURATION_SECONDS} сек</span>.
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-cream/60">
          Загружено: <span className="font-bold text-cream-soft">{count}</span> / {MAX_VIDEOS}
          {todayIndex !== null && (
            <span className="ml-2 text-gold">· сегодня #{todayIndex + 1}</span>
          )}
        </span>
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
            <div
              key={v.id}
              className={`flex items-center gap-4 rounded-xl border p-3 ${
                todayIndex === i
                  ? "border-gold/40 bg-gold/10"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <video src={v.url} muted className="h-16 w-28 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cream-soft">
                  #{i + 1} · {new Date(v.uploadedAt).toLocaleDateString("ru-RU")}
                  {typeof v.durationSeconds === "number" && (
                    <span className="text-cream/45"> · {v.durationSeconds}с</span>
                  )}
                  {todayIndex === i && (
                    <span className="ml-2 text-xs font-semibold text-gold">сегодня</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDelete(v.id)}
                className="shrink-0 rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-400 transition hover:bg-red-400/10"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
