// Централизованная конфигурация экосистемы DOFFA.
// Единственный источник правды для: mint токена, Reward Vault, ссылок на игру/
// APK/DEX/Solscan и СТАТУСОВ функций. Реальные значения приходят из env
// (NEXT_PUBLIC_*). Пока функция не подключена — её статус honestly = "planned"
// или "testing", а UI обязан показывать это, а не выдавать демо за живую фичу.
//
// ВАЖНО: приватные ключи здесь не хранятся и не читаются. Только публичные данные.

export type FeatureStatus = "live" | "testing" | "planned" | "paused";

function parseStatus(v: string | undefined, fallback: FeatureStatus): FeatureStatus {
  const s = (v ?? "").trim().toLowerCase();
  return s === "live" || s === "testing" || s === "planned" || s === "paused" ? s : fallback;
}

function envStr(v: string | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

const DEFAULT_MINT = "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo";
const mint = envStr(process.env.NEXT_PUBLIC_DOFFA_MINT) ?? DEFAULT_MINT;
const vaultAddress = envStr(process.env.NEXT_PUBLIC_REWARD_VAULT_ADDRESS);
const apkUrl = envStr(process.env.NEXT_PUBLIC_ANDROID_APK_URL);

// Доля награды: игроку / на сжигание. Берётся из env, дефолт 80/20.
function pct(v: string | undefined, fallback: number): number {
  const s = (v ?? "").trim();
  if (!s) return fallback; // пусто → дефолт (Number("") === 0 иначе прошёл бы проверку)
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}
const playerRewardPercent = pct(process.env.NEXT_PUBLIC_PLAYER_REWARD_PERCENT, 80);
const burnPercent = pct(process.env.NEXT_PUBLIC_BURN_PERCENT, 20);

export const ECOSYSTEM = {
  // Публичное название игрового направления и главной игры.
  productName: envStr(process.env.NEXT_PUBLIC_GAMES_NAME) ?? "DOFFA Games",
  primaryGameName: envStr(process.env.NEXT_PUBLIC_PRIMARY_GAME_NAME) ?? "DOFFA Bean Duel",
  token: {
    symbol: "$DOFFA",
    mint,
    solscanUrl:
      envStr(process.env.NEXT_PUBLIC_SOLSCAN_TOKEN_URL) ?? `https://solscan.io/token/${mint}`,
  },
  rewardVault: {
    /** Первоначальный размер игрового фонда наград. */
    initial: Number(process.env.NEXT_PUBLIC_REWARD_POOL_INITIAL) || 1_000_000,
    /** Публичный адрес фонда. null — ещё не опубликован (показывать «Planned»). */
    address: vaultAddress,
  },
  game: {
    /** URL веб-версии игры. null — не показывать фальшивую ссылку. */
    webUrl: envStr(process.env.NEXT_PUBLIC_GAME_WEB_URL),
    apk: {
      url: apkUrl,
      version: envStr(process.env.NEXT_PUBLIC_ANDROID_VERSION),
      size: envStr(process.env.NEXT_PUBLIC_ANDROID_SIZE),
      sha256: envStr(process.env.NEXT_PUBLIC_ANDROID_SHA256),
    },
  },
  dex: {
    /** URL стороннего DEX-пула DOFFA/SOL. null — «Пул пока не запущен». */
    url: envStr(process.env.NEXT_PUBLIC_DEX_URL),
  },
  // Наградная модель Bean Duel. Доли берутся из конфигурации, не из «воздуха».
  reward: {
    playerPercent: playerRewardPercent,
    burnPercent,
  },
  // Честные статусы функций. UI обязан показывать их, а не выдавать Planned за Live.
  status: {
    claims: parseStatus(process.env.NEXT_PUBLIC_CLAIMS_STATUS, "testing"),
    dex: parseStatus(process.env.NEXT_PUBLIC_DEX_STATUS, "planned"),
    burn: parseStatus(process.env.NEXT_PUBLIC_BURN_STATUS, "planned"),
    android: (apkUrl ? "live" : "planned") as FeatureStatus,
    rewardVault: (vaultAddress ? "live" : "planned") as FeatureStatus,
  },
  ads: {
    enabled: (process.env.NEXT_PUBLIC_ADS_ENABLED ?? "").trim() === "true",
  },
} as const;

/** Человекочитаемая метка статуса (RU) для бейджей на сайте. */
export const STATUS_LABEL_RU: Record<FeatureStatus, string> = {
  live: "Работает",
  testing: "Тестовый режим",
  planned: "Готовится",
  paused: "Приостановлено",
};
