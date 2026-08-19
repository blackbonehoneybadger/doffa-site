import "server-only";

// СЕРВЕРНАЯ конфигурация DOFFA Marketplace. ЗДЕСЬ живут значения из НЕ-публичных
// env (без префикса NEXT_PUBLIC_). Импортировать ТОЛЬКО из серверного кода
// (server components, route handlers, app/lib/**). Не импортировать в "use client"
// компоненты: non-NEXT_PUBLIC переменные Next вырезает из клиентского bundle, а
// эта договорённость держит секреты вне браузера. Приватные ключи здесь не хранятся.

const envStr = (v: string | undefined) => {
  const s = v?.trim();
  return s ? s : null;
};

function feePercent(v: string | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null; // не задаём произвольную комиссию без подтверждения владельца
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export const MERCH_SERVER = {
  /** Комиссия площадки, %. null → не настроена (не берём произвольное значение). */
  marketplaceFeePercent: feePercent(process.env.MARKETPLACE_FEE_PERCENT),

  /** Email администратора для уведомлений о заявках/модерации. */
  adminEmail: envStr(process.env.MERCH_ADMIN_EMAIL),

  /** Отдельная БД маркетплейса (если вынесена). По умолчанию — общий DATABASE_URL. */
  databaseUrl: envStr(process.env.MERCH_DATABASE_URL) ?? envStr(process.env.DATABASE_URL),

  /** Токен хранилища загрузок (Vercel Blob и т.п.). */
  uploadStorageToken: envStr(process.env.MERCH_UPLOAD_STORAGE_TOKEN),

  /** Секрет платёжного провайдера (fiat). null → провайдер не подключён. */
  paymentProviderSecret: envStr(process.env.MERCH_PAYMENT_PROVIDER_SECRET),

  /** Адрес-получатель платежей в DOFFA. Приватный ключ здесь НЕ хранится. */
  doffaReceiverAddress: envStr(process.env.DOFFA_PAYMENT_RECEIVER_ADDRESS),

  /** Ключ провайдера цены DOFFA (котировки). */
  doffaPriceProviderApiKey: envStr(process.env.DOFFA_PRICE_PROVIDER_API_KEY),

  /** RPC для серверной проверки Solana-транзакций. */
  solanaRpc: envStr(process.env.SOLANA_RPC) ?? "https://api.mainnet-beta.solana.com",
} as const;

/** Готовность интеграций (сервер сам решает, что реально работает). */
export const MERCH_SERVER_READY = {
  fiatPayments: Boolean(MERCH_SERVER.paymentProviderSecret),
  doffaPayments: Boolean(MERCH_SERVER.doffaReceiverAddress),
  uploads: Boolean(MERCH_SERVER.uploadStorageToken),
  database: Boolean(MERCH_SERVER.databaseUrl),
} as const;
