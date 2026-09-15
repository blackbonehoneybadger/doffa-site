// Централизованная конфигурация экосистемы DOFFA.
// Единственный источник правды для: адреса токена, фонда наград, ссылок на
// игру и обозреватель, чисел экономики и СТАТУСОВ функций. Реальные значения
// приходят из env (NEXT_PUBLIC_*). Пока функция не подключена — её статус
// honestly = "planned" или "testing", а UI обязан показывать это, а не выдавать
// демонстрацию за живую фичу.
//
// ВАЖНО: приватные ключи здесь не хранятся и не читаются. Только публичные данные.
//
// РЕШЕНИЕ ВЛАДЕЛЬЦА 15.09.2026. Монета экосистемы — DOFF в сети TON. Главная
// игра — DOFFA DRAKA, живая, в Telegram.
//
// Прежняя $DOFFA в сети Solana с сайта убрана полностью и намеренно: владелец
// решил ею не пользоваться. Контракт в сети остался — удалить его нельзя
// никому, — но сайт про него больше не рассказывает и ничего от него не
// показывает. Ни адреса, ни эмиссии, ни баланса, ни чёрной дыры. Нужна будет
// история — она в git и в docs/, а не на странице.

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

function pct(v: string | undefined, fallback: number): number {
  const s = (v ?? "").trim();
  if (!s) return fallback; // пусто → дефолт (Number("") === 0 иначе прошёл бы проверку)
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// ГЛАВНАЯ МОНЕТА: DOFF в TON
// ─────────────────────────────────────────────────────────────────────────────

// Мастер-контракт Jetton. Выпущен 15.09.2026 в основной сети TON и сверен
// чтением из сети: адрес, эмиссия, отсутствие допечатки и адрес метаданных
// совпали с тем, что записано здесь. Это единственный адрес, по которому
// кошелёк отличает настоящую DOFF от подделки с тем же тикером.
const DOFF_MASTER = "EQDJEC9EOYnVSUjNPsAXfLaRDNlm9wDYMKr3iM2IdhPqgQgh";

// Полная эмиссия DOFF. Выпущена вся и сразу; допечатки нет — право админа
// снимается, и после этого выпустить ещё одну DOFF невозможно никому,
// включая владельца.
const DOFF_SUPPLY = 1_000_000_000;
const DOFF_DECIMALS = 9;

// Фонд наград: кошелёк, с которого игра платит за обменянные зёрна. Публичный
// адрес — чтобы любой мог посмотреть остаток и убедиться, что он реальный.
// Приватный ключ к нему живёт только в секретах и никогда в репозитории.
const DOFF_TREASURY = "UQCnClctLMcB1xBoHETl-Dzp6cLRv9oWUmz_nqz6IBYepJLH";

const doffMaster = envStr(process.env.NEXT_PUBLIC_DOFF_MASTER) ?? DOFF_MASTER;
const doffTreasury = envStr(process.env.NEXT_PUBLIC_DOFF_TREASURY) ?? DOFF_TREASURY;

// Холодное хранение эмиссии. Адрес публикуется только если владелец сам
// задал переменную: пока он этого не сделал, сайт говорит, что эмиссия на
// холодном хранении, но адрес не называет. Умолчания тут нет намеренно —
// решение «показывать основное хранилище публично» принимает владелец, а не
// файл конфигурации.
const doffColdStorage = envStr(process.env.NEXT_PUBLIC_DOFF_COLD_STORAGE);

// ─────────────────────────────────────────────────────────────────────────────
// ЭКОНОМИКА: числа, посчитанные кодом игры (server/emission.mjs, token-split.mjs)
// ─────────────────────────────────────────────────────────────────────────────

// Доля фонда, уходящая в дневной пул. Одна тысячная в сутки.
//
// Отсюда главное свойство экономики: Ф(n) = Ф₀·(1−p)ⁿ строго больше нуля при
// любом n — фонд не кончается, а не «надолго хватает». Постоянный курс этого
// не даёт: при 25 000 зёрен в сутки на аккаунт тысяча игроков вынесла бы фонд
// в миллион за сорок суток.
const POOL_DENOMINATOR = amountEnv(process.env.NEXT_PUBLIC_POOL_DENOMINATOR, 1000);

// Дележ банка боя на DOFF и суммы вывода. Доли сервер считает сам: контракт
// типового Jetton переделать нельзя, и это не обход, а единственный путь.
const FIGHT_BURN = pct(process.env.NEXT_PUBLIC_FIGHT_BURN_PERCENT, 5);
const FIGHT_PRIZE = pct(process.env.NEXT_PUBLIC_FIGHT_PRIZE_PERCENT, 5);
const WITHDRAW_BURN = pct(process.env.NEXT_PUBLIC_WITHDRAW_BURN_PERCENT, 1);
const WITHDRAW_PRIZE = pct(process.env.NEXT_PUBLIC_WITHDRAW_PRIZE_PERCENT, 1);

// Сколько зёрен аккаунт может создать за сутки (server/economy.mjs) и базовый
// курс, от которого начинается пересчёт.
const DAILY_BEAN_CAP = amountEnv(process.env.NEXT_PUBLIC_DAILY_BEAN_CAP, 25_000);
const BASE_BEANS_PER_DOFF = amountEnv(process.env.NEXT_PUBLIC_BASE_BEANS_PER_DOFF, 1000);

// ─────────────────────────────────────────────────────────────────────────────
// ИГРА: DOFFA DRAKA
// ─────────────────────────────────────────────────────────────────────────────

const TELEGRAM_BOT_USERNAME = "doffadrakabot";
const botUsername = envStr(process.env.NEXT_PUBLIC_TELEGRAM_BOT) ?? TELEGRAM_BOT_USERNAME;

/**
 * Реферальный код владельца в формате игры: DF-000123.
 *
 * Пока он не задан, сайт ведёт в бота обычной ссылкой — без ссылки, которая
 * приписывает игрока не тому. Подставлять сюда чужой или выдуманный код нельзя:
 * приглашение привязывается к аккаунту навсегда и переиграть его нечем.
 */
const referralCode = envStr(process.env.NEXT_PUBLIC_GAME_REFERRAL_CODE);

/**
 * Ссылка в игру. Формат повторяет game/public/telegram.mjs слово в слово:
 * ?start=ref_DF-000123 для приглашения и ?startapp для обычного входа. Разойтись
 * им нельзя — бот разбирает именно эти две формы.
 *
 * Проверка кода здесь не украшение: ссылка с мусором вместо кода молча уводила
 * бы игроков мимо приглашения, и заметить это можно было бы только по пустому
 * списку приглашённых через месяц.
 */
export function ссылкаВИгру(username: string | null, код: string | null): string {
  const имя = /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username ?? "") ? username! : TELEGRAM_BOT_USERNAME;
  const совпало = /^DF-?([0-9]{1,16})$/i.exec((код ?? "").trim());
  return совпало
    ? `https://t.me/${имя}?start=ref_DF-${совпало[1].padStart(6, "0")}`
    : `https://t.me/${имя}?startapp`;
}

const gameTelegram = envStr(process.env.NEXT_PUBLIC_GAME_TELEGRAM_URL) ?? ссылкаВИгру(botUsername, referralCode);


// ─────────────────────────────────────────────────────────────────────────────

export const ECOSYSTEM = {
  // Публичное название игрового направления и главной игры.
  productName: envStr(process.env.NEXT_PUBLIC_GAMES_NAME) ?? "DOFFA Games",
  primaryGameName: envStr(process.env.NEXT_PUBLIC_PRIMARY_GAME_NAME) ?? "DOFFA DRAKA",

  /** Главная монета экосистемы: DOFF в TON. */
  token: {
    symbol: "DOFF",
    network: "TON",
    standard: "TEP-74 Jetton",
    master: doffMaster,
    decimals: DOFF_DECIMALS,
    explorerUrl:
      envStr(process.env.NEXT_PUBLIC_DOFF_EXPLORER_URL) ?? `https://tonviewer.com/${doffMaster}`,
    /** Полная эмиссия. Выпущена вся; допечатки нет. */
    totalSupply: DOFF_SUPPLY,
    /** Право допечатки. false — выпустить новые DOFF нельзя никому. */
    mintable: false,
    /** Эмиссия лежит на холодном хранении; адрес публикуется только по решению владельца. */
    coldStorage: doffColdStorage,
  },

  /** Фонд наград: из него игра платит за обменянные зёрна. */
  rewardVault: {
    address: doffTreasury,
    explorerUrl:
      envStr(process.env.NEXT_PUBLIC_DOFF_TREASURY_EXPLORER_URL) ??
      `https://tonviewer.com/${doffTreasury}`,
    /** Рабочий остаток фонда, если владелец решил его назвать. null — читать из сети. */
    initial: amountEnv(process.env.NEXT_PUBLIC_REWARD_POOL_INITIAL, 0),
  },

  /**
   * Числа экономики. Все до одного посчитаны кодом игры и проверены тестами:
   * server/emission.mjs, server/token-split.mjs, server/economy.mjs.
   */
  economy: {
    /** Пул = фонд / poolDenominator в сутки. Отсюда «фонд не кончается». */
    poolDenominator: POOL_DENOMINATOR,
    /** Бой на DOFF: банк из двух ставок делится так. */
    fight: { burn: FIGHT_BURN, prize: FIGHT_PRIZE, winner: 100 - FIGHT_BURN - FIGHT_PRIZE },
    /** Вывод на свой кошелёк. Держится нарочно маленьким. */
    withdrawal: {
      burn: WITHDRAW_BURN,
      prize: WITHDRAW_PRIZE,
      player: 100 - WITHDRAW_BURN - WITHDRAW_PRIZE,
    },
    /** Сколько зёрен аккаунт может создать за сутки. Проверяется до боя. */
    dailyBeanCap: DAILY_BEAN_CAP,
    /** Курс, с которого начинается ежесуточный пересчёт. */
    baseBeansPerToken: BASE_BEANS_PER_DOFF,
  },

  game: {
    /** Имя бота — для текста «найди @doffadrakabot в поиске». */
    botUsername,
    /** Реферальный код владельца. null — ссылка ведёт в бота без приглашения. */
    referralCode,
    /** Игра живёт в Telegram. Это и есть настоящая ссылка, а не заглушка. */
    telegramUrl: gameTelegram,
    /** Прямой веб-адрес мини-приложения. Открывать вне Telegram смысла нет. */
    webUrl: envStr(process.env.NEXT_PUBLIC_GAME_WEB_URL),
  },

  dex: {
    /** URL стороннего DEX-пула DOFF. null — «Пул пока не запущен». */
    url: envStr(process.env.NEXT_PUBLIC_DEX_URL),
  },

  /**
   * Честные статусы. UI обязан показывать их, а не выдавать Planned за Live.
   *
   * Почему обмен и вывод — не "live", хотя токен выпущен. Игра списывает зёрна
   * и ставит заявку в очередь, а платит по ней отправитель, который подписывает
   * перевод ключом фонда. Ключ в репозиторий не попадает, и пока владелец не
   * положил его в секреты, платить некому: включить флаг значило бы копить
   * заявки, по которым никто не платит. Обмен открывают четыре условия сразу
   * (server/token-policy.mjs), а не правка этой строки.
   */
  status: {
    token: parseStatus(process.env.NEXT_PUBLIC_TOKEN_STATUS, "live"),
    game: parseStatus(process.env.NEXT_PUBLIC_GAME_STATUS, "live"),
    exchange: parseStatus(process.env.NEXT_PUBLIC_EXCHANGE_STATUS, "planned"),
    claims: parseStatus(process.env.NEXT_PUBLIC_CLAIMS_STATUS, "planned"),
    burn: parseStatus(process.env.NEXT_PUBLIC_BURN_STATUS, "planned"),
    dex: parseStatus(process.env.NEXT_PUBLIC_DEX_STATUS, "planned"),
    rewardVault: (doffTreasury ? "live" : "planned") as FeatureStatus,
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

/** Сокращение адреса для показа: начало…конец. Полный адрес даёт копирование. */
export function shortAddress(address: string, head = 6, tail = 6): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}
