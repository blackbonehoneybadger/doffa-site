// Счётчики посещаемости и игровых действий для админ-панели.
import { readJsonBlob, writeJsonBlob } from "./blobJson";

const STATS_PATH = "analytics/stats.json";

export type SiteStats = {
  visits: number;
  gameOpens: number;
  gameDownloads: number;
  /** Токены, отмеченные как выданные (игровые награды) — ручной/внешний учёт. */
  tokensAwarded: number;
  /** Уникальные посетители за сегодня (по cookie visitor-id). */
  todayVisitors: string[];
  todayKey: string; // YYYY-MM-DD UTC
  /** История по дням: дата → визиты. */
  dailyVisits: Record<string, number>;
};

const EMPTY: SiteStats = {
  visits: 0,
  gameOpens: 0,
  gameDownloads: 0,
  tokensAwarded: 0,
  todayVisitors: [],
  todayKey: "",
  dailyVisits: {},
};

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function load(): Promise<SiteStats> {
  const data = await readJsonBlob<SiteStats>(STATS_PATH, EMPTY);
  return { ...EMPTY, ...data, todayVisitors: data.todayVisitors ?? [], dailyVisits: data.dailyVisits ?? {} };
}

async function save(stats: SiteStats): Promise<void> {
  await writeJsonBlob(STATS_PATH, stats);
}

function rollDay(stats: SiteStats): SiteStats {
  const today = utcDayKey();
  if (stats.todayKey === today) return stats;
  return { ...stats, todayKey: today, todayVisitors: [] };
}

export type TrackEvent = "visit" | "game_open" | "game_download";

export async function trackEvent(
  event: TrackEvent,
  visitorId?: string | null,
): Promise<SiteStats> {
  let stats = rollDay(await load());
  const today = utcDayKey();

  if (event === "visit") {
    stats.visits += 1;
    stats.dailyVisits[today] = (stats.dailyVisits[today] ?? 0) + 1;
    if (visitorId && !stats.todayVisitors.includes(visitorId)) {
      stats.todayVisitors = [...stats.todayVisitors, visitorId].slice(-5000);
    }
  } else if (event === "game_open") {
    stats.gameOpens += 1;
  } else if (event === "game_download") {
    stats.gameDownloads += 1;
  }

  await save(stats);
  return stats;
}

export async function getStats(): Promise<SiteStats & { uniqueToday: number }> {
  const stats = rollDay(await load());
  return { ...stats, uniqueToday: stats.todayVisitors.length };
}

export async function addAwardedTokens(amount: number): Promise<SiteStats> {
  const stats = await load();
  stats.tokensAwarded = Math.max(0, stats.tokensAwarded + amount);
  await save(stats);
  return stats;
}
