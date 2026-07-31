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

// Чёрная дыра $DOFFA — адрес, из которого токены не возвращаются.
//
// 2026-07-01 с кошелька проекта было переведено ровно 1 000 000 $DOFFA на
// Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV — задумывался как фонд наград.
// Приватный ключ к нему утерян: его искали в файлах, в истории git, во всех
// аккаунтах Phantom и в переменных Railway — нигде. 2026-07-29 признан
// утраченным, и этот адрес объявлен чёрной дырой проекта.
//
// ⚠️ ЧЕСТНАЯ ГРАНИЦА УТВЕРЖДЕНИЯ. Две вещи, которые нельзя смешивать:
//
// 1. Это НЕ сжигание. Сжигание (SPL burn) уменьшает supply в сети; здесь
//    supply по-прежнему 100 000 000. Токены лежат на адресе, а не уничтожены.
//    Поэтому сайт обязан показывать обе цифры и объяснять разницу.
// 2. Адрес лежит НА кривой ed25519 — значит приватный ключ математически
//    существует, просто им никто не владеет. Это отличает его от канонического
//    инсинератора 1nc1nerator11111111111111111111111111111111, который вне
//    кривой и ключа не имеет в принципе. Наша необратимость — утверждение о
//    потере ключа, а не математическая гарантия, и формулировать надо так.
//
// Практический вывод: для БУДУЩИХ сжиганий использовать реальный SPL burn — он
// уменьшает supply и проверяется в сети без доверия к нам. Досылать сюда новые
// токены смысла нет: это слабее burn по проверяемости.
const BLACK_HOLE_ADDRESS = "Hk6X6qb32RD8N5DgMv17wiR8aj88v1h8BShSEHJGKcLV";
const BLACK_HOLE_AMOUNT = 1_000_000;
// Подпись самой транзакции перевода 2026-07-01. Ссылка на неё — главное
// доказательство: любой открывает и видит ровно то, что написано на сайте.
const BLACK_HOLE_TX =
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
     * Фактически доступный объём: эмиссия за вычетом того, что ушло в чёрную
     * дыру. Именно этой цифрой корректно описывать живой запас проекта.
     */
    effectiveSupply: TOTAL_SUPPLY - amountEnv(process.env.NEXT_PUBLIC_BLACK_HOLE_AMOUNT, BLACK_HOLE_AMOUNT),
  },
  /**
   * Чёрная дыра проекта: адрес, с которого токены не возвращаются.
   * amount = 0 → в дыре ничего нет, блок на сайте не показывается.
   *
   * ВАЖНО: это не сжигание (supply в сети не меняется) и не математическая
   * невозвратность (адрес на кривой, ключ существует, но утерян). Подробности
   * и границы утверждения — в комментарии к BLACK_HOLE_ADDRESS выше.
   */
  blackHole: {
    address: envStr(process.env.NEXT_PUBLIC_BLACK_HOLE_ADDRESS) ?? BLACK_HOLE_ADDRESS,
    amount: amountEnv(process.env.NEXT_PUBLIC_BLACK_HOLE_AMOUNT, BLACK_HOLE_AMOUNT),
    /** Транзакция перевода — прямое доказательство, ссылку даём на сайте. */
    txSignature: envStr(process.env.NEXT_PUBLIC_BLACK_HOLE_TX) ?? BLACK_HOLE_TX,
    /**
     * Ключ существует математически (адрес на кривой ed25519), но утерян.
     * false означало бы адрес вне кривой — там ключа нет в принципе.
     * Сайт использует это, чтобы не обещать больше, чем может доказать.
     */
    keyExistsButLost: true,
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
