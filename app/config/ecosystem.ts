// Централизованная конфигурация экосистемы DOFFA.
// Единственный источник правды для: токена, кошелька владельца, наградной
// модели, ссылок и СТАТУСОВ функций. Реальные значения приходят из env
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

/** Неотрицательное число из env. Пусто → дефолт; 0 задать можно явно. */
function amountEnv(v: string | undefined, fallback: number): number {
  const s = (v ?? "").trim();
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/* ═══════════════════════ НОВЫЙ ТОКЕН DOFFA ═══════════════════════ */

/**
 * Единственный управляемый кошелёк проекта. Вся эмиссия нового токена уходит
 * на него. Дополнительных treasury/reward/liquidity кошельков нет — именно
 * их размножение в прошлый раз и привело к потере ключа от одного из них.
 */
const OWNER_WALLET = "E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr";

const TOTAL_SUPPLY = 100_000_000;
const DECIMALS = 6;

/**
 * Адрес mint нового токена.
 *
 * ⚠️ Дефолта здесь НЕТ и быть не должно. Пока токен в mainnet не создан,
 * значение остаётся null, и сайт обязан честно показывать «Mainnet token not
 * deployed yet». Подставить сюда старый mint или выдуманный адрес — значит
 * соврать посетителю о том, чего не существует.
 *
 * Заполняется переменной NEXT_PUBLIC_DOFFA_MINT после реального выпуска.
 */
const mint = envStr(process.env.NEXT_PUBLIC_DOFFA_MINT);

/** Постоянный URI метаданных (IPFS/Arweave). null — ещё не загружены. */
const metadataUri = envStr(process.env.NEXT_PUBLIC_DOFFA_METADATA_URI);

/* ═══════════════════════ LEGACY-ТОКЕН (DEPRECATED) ═══════════════════════ */

/**
 * Старый токен DOFFA. НЕ ИСПОЛЬЗУЕТСЯ в игровых механиках, оплате и наградах.
 *
 * Адреса живут здесь по одной причине: сайт обязан показать их на /token в
 * разделе legacy — старый токен публично виден в сети, и умолчать о нём
 * значило бы попытаться скрыть. Но ни одно операционное поле (token.mint,
 * оплата мерча, награды) на него больше не ссылается — это проверяется тестом.
 *
 * Чёрная дыра Hk6X6qb… — адрес, из которого токены не возвращаются: ключ к
 * нему утерян. Две границы, которые нельзя усиливать, потому что обе
 * проверяются публично:
 *   1. Это НЕ сжигание — supply старого токена в сети не изменился.
 *   2. Адрес НА кривой ed25519 — ключ математически существует, просто им
 *      никто не владеет. Не то же самое, что канонический инсинератор.
 */
type LegacyToken = {
  readonly mint: string;
  readonly ownerWallet: string;
  readonly totalSupply: number;
  readonly deprecatedAt: string;
  readonly blackHole: {
    readonly address: string;
    readonly amount: number;
    readonly txSignature: string;
    readonly keyExistsButLost: boolean;
  };
};

const LEGACY: LegacyToken = {
  mint: "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo",
  ownerWallet: "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS",
  totalSupply: 100_000_000,
  deprecatedAt: "2026-07-30",
  blackHole: {
    address: "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV",
    amount: 1_000_000,
    txSignature:
      "v8NitwxyDKsySiSUPc9evfRLt6Yh3Jj4pC5wJpamyDZ8cU484zdCosa9A4wRkfarmxZMf5xMsqmMsKipKdL9kYA",
    /** Ключ существует математически, но утерян. Не «ключа не существует». */
    keyExistsButLost: true,
  },
};

/* ═══════════════════════ НАГРАДНАЯ МОДЕЛЬ (DRAFT) ═══════════════════════ */

/**
 * Распределение DOFFA в игровых механиках: игроку / на сжигание / в казну.
 *
 * ⚠️ Экономика владельцем ещё НЕ утверждена, поэтому по умолчанию модель
 * выключена (draft) и сайт не показывает никаких процентов. Показать
 * непроверенные доли значило бы дать обещание, которого никто не давал.
 *
 * Чтобы включить, нужно задать ВСЕ три переменные, и их сумма обязана быть
 * ровно 100. Любое другое сочетание оставляет модель в draft — молча
 * «донормировать» проценты нельзя: это исказило бы заявленную экономику.
 */
function pctEnv(v: string | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

const rewardPct = pctEnv(process.env.NEXT_PUBLIC_GAME_REWARD_PERCENT);
const burnPct = pctEnv(process.env.NEXT_PUBLIC_GAME_BURN_PERCENT);
const treasuryPct = pctEnv(process.env.NEXT_PUBLIC_GAME_TREASURY_PERCENT);

const allPctSet = rewardPct !== null && burnPct !== null && treasuryPct !== null;
const pctSum = allPctSet ? rewardPct + burnPct + treasuryPct : null;
const pctValid = pctSum === 100;

/**
 * Проверка суммы долей. Экспортируется, чтобы её можно было вызвать в тестах
 * и в CI, а не только полагаться на то, что кто-то посмотрит на сайт.
 */
export function validateRewardSplit(
  reward: number | null,
  burn: number | null,
  treasury: number | null,
): { valid: boolean; sum: number | null; reason: string | null } {
  if (reward === null || burn === null || treasury === null) {
    return { valid: false, sum: null, reason: "заданы не все три доли — модель остаётся draft" };
  }
  const sum = reward + burn + treasury;
  if (sum !== 100) {
    return { valid: false, sum, reason: `сумма долей ${sum} ≠ 100` };
  }
  return { valid: true, sum, reason: null };
}

/* ═══════════════════════ ПРОЧЕЕ ═══════════════════════ */

const vaultAddress = envStr(process.env.NEXT_PUBLIC_REWARD_VAULT_ADDRESS);
const apkUrl = envStr(process.env.NEXT_PUBLIC_ANDROID_APK_URL);

export const ECOSYSTEM = {
  // Публичное название игрового направления и главной игры.
  productName: envStr(process.env.NEXT_PUBLIC_GAMES_NAME) ?? "DOFFA Games",
  primaryGameName: envStr(process.env.NEXT_PUBLIC_PRIMARY_GAME_NAME) ?? "DOFFA Heroes",

  /** Единственный управляемый кошелёк владельца. */
  ownerWallet: envStr(process.env.NEXT_PUBLIC_DOFFA_OWNER_WALLET) ?? OWNER_WALLET,

  token: {
    name: "DOFFA",
    symbol: "DOFFA",
    /** null — токен в mainnet ещё не создан. Выдумывать адрес нельзя. */
    mint,
    /** true только когда mint реально существует. */
    deployed: mint !== null,
    decimals: DECIMALS,
    network: "mainnet-beta" as const,
    /** Заявленная эмиссия. Фактическая читается из сети и может быть меньше после burn. */
    initialSupply: TOTAL_SUPPLY,
    metadataUri,
    /** Ссылка на explorer. null, пока mint не создан. */
    solscanUrl: mint ? `https://solscan.io/token/${mint}` : null,
  },

  /** Старый токен. Только для отображения в разделе legacy, не для механик. */
  legacy: LEGACY,

  /**
   * Наградная модель. Пока draft — сайт не показывает процентов вообще.
   * Включается только полным и корректным набором из трёх долей.
   */
  rewardModel: {
    draft: !pctValid,
    valid: pctValid,
    rewardPercent: pctValid ? rewardPct : null,
    burnPercent: pctValid ? burnPct : null,
    treasuryPercent: pctValid ? treasuryPct : null,
    sum: pctSum,
  },

  rewardVault: {
    initial: amountEnv(process.env.NEXT_PUBLIC_REWARD_POOL_INITIAL, 0),
    /** Публичный адрес фонда. null — ещё не назначен. */
    address: vaultAddress,
  },

  game: {
    /** URL веб-версии игры. null — не показывать фальшивую ссылку. */
    webUrl: envStr(process.env.NEXT_PUBLIC_GAME_WEB_URL),
    shelfUrl: envStr(process.env.NEXT_PUBLIC_SHELF_URL),
    arenaUrl: envStr(process.env.NEXT_PUBLIC_ARENA_URL),
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

  // Честные статусы функций. UI обязан показывать их, а не выдавать Planned за Live.
  status: {
    // Токен — Live только когда mint существует в сети.
    token: (mint ? "live" : "planned") as FeatureStatus,
    claims: parseStatus(process.env.NEXT_PUBLIC_CLAIMS_STATUS, "planned"),
    dex: parseStatus(process.env.NEXT_PUBLIC_DEX_STATUS, "planned"),
    burn: parseStatus(process.env.NEXT_PUBLIC_BURN_STATUS, "planned"),
    shelf: parseStatus(process.env.NEXT_PUBLIC_SHELF_STATUS, "planned"),
    arena: parseStatus(process.env.NEXT_PUBLIC_ARENA_STATUS, "planned"),
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
