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

// Полная эмиссия $DOFFA. Подтверждается в сети (getTokenSupply) и не может
// вырасти: право mint отозвано.
const TOTAL_SUPPLY = 100_000_000;

// Безвозвратно недоступные токены.
//
// 2026-07-01 с кошелька проекта было переведено ровно 1 000 000 $DOFFA на
// Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV, который задумывался как фонд
// наград. Доступ к этому кошельку утерян: приватного ключа нет, и вернуть
// токены невозможно.
//
// Токены остаются в сети — эмиссия по-прежнему 100 000 000, это НЕ сжигание.
// Но выплатить или продать их нельзя, поэтому из наградной модели и из
// фактически доступного объёма они исключены. Скрывать это нельзя: сайт
// обещает награды, и обещать их из недоступного кошелька было бы обманом.
const UNREACHABLE_ADDRESS = "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV";
const UNREACHABLE_AMOUNT = 1_000_000;
// Подпись самой транзакции перевода 2026-07-01. Ссылка на неё — главное
// доказательство: любой открывает и видит ровно то, что написано на сайте.
const UNREACHABLE_TX =
  "v8NitwxyDKsySiSUPc9evfRLt6Yh3Jj4pC5wJpamyDZ8cU484zdCosa9A4wRkfarmxZMf5xMsqmMsKipKdL9kYA";

/** Неотрицательное число из env. Пусто → дефолт; 0 задать можно явно. */
function amountEnv(v: string | undefined, fallback: number): number {
  const s = (v ?? "").trim();
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
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
  primaryGameName: envStr(process.env.NEXT_PUBLIC_PRIMARY_GAME_NAME) ?? "DOFFA Heroes",
  token: {
    symbol: "$DOFFA",
    mint,
    solscanUrl:
      envStr(process.env.NEXT_PUBLIC_SOLSCAN_TOKEN_URL) ?? `https://solscan.io/token/${mint}`,
    /** Полная эмиссия по данным сети. */
    totalSupply: TOTAL_SUPPLY,
    /**
     * Фактически доступный объём: эмиссия за вычетом безвозвратно недоступных
     * токенов. Именно этой цифрой корректно описывать живой запас проекта.
     */
    effectiveSupply: TOTAL_SUPPLY - amountEnv(process.env.NEXT_PUBLIC_UNREACHABLE_AMOUNT, UNREACHABLE_AMOUNT),
  },
  /** Токены, доступ к которым утерян навсегда. amount = 0 → таких токенов нет. */
  unreachable: {
    address: envStr(process.env.NEXT_PUBLIC_UNREACHABLE_ADDRESS) ?? UNREACHABLE_ADDRESS,
    amount: amountEnv(process.env.NEXT_PUBLIC_UNREACHABLE_AMOUNT, UNREACHABLE_AMOUNT),
    /** Транзакция перевода — прямое доказательство, ссылку даём на сайте. */
    txSignature: envStr(process.env.NEXT_PUBLIC_UNREACHABLE_TX) ?? UNREACHABLE_TX,
  },
  rewardVault: {
    /**
     * Размер назначенного фонда наград. 0 — фонд не назначен: прежний утерян,
     * новый пока не выделен. Заполняется через NEXT_PUBLIC_REWARD_POOL_INITIAL
     * одновременно с NEXT_PUBLIC_REWARD_VAULT_ADDRESS.
     */
    initial: amountEnv(process.env.NEXT_PUBLIC_REWARD_POOL_INITIAL, 0),
    /** Публичный адрес фонда. null — ещё не назначен (показывать «Planned»). */
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
  // Наградная модель DOFFA Heroes. Доли берутся из конфигурации, не из «воздуха».
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
