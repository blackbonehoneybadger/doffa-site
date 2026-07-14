// Лёгкая интеграция с Solana без тяжёлых библиотек:
// читаем данные токена через публичный JSON-RPC и подключаем Phantom через
// встроенный в браузер провайдер.
//
// $DOFFA выпущен на mainnet: эмиссия 100 000 000, mint/freeze authority
// отозваны навсегда. Токен — награда игровой экосистемы DOFFA Crazy 8.
//
// Переменные окружения Vercel (NEXT_PUBLIC_*):
//   NEXT_PUBLIC_REAL_MINT   = адрес mint (обязательна)
//   NEXT_PUBLIC_REAL_RPC    = RPC mainnet (по умолчанию публичный)
//   NEXT_PUBLIC_REAL_WALLET = кошелёк-держатель (для отображения до выпуска)

export type Cluster = "devnet" | "mainnet-beta";

export type TokenInfo = {
  cluster: Cluster;
  rpc: string;
  /** Адрес mint. null — токен ещё не создан. */
  mint: string | null;
  /** Кошелёк-держатель токена (treasury). */
  wallet: string | null;
  /** Полная эмиссия токена — для отображения общего выпуска на сайте. */
  initialSupply: number;
};

/** $DOFFA на mainnet — боевой токен экосистемы (игровые награды из Reward Vault). */
export const REAL: TokenInfo = {
  cluster: "mainnet-beta",
  rpc: process.env.NEXT_PUBLIC_REAL_RPC || "https://api.mainnet-beta.solana.com",
  mint: process.env.NEXT_PUBLIC_REAL_MINT?.trim() || "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo",
  // Phantom-кошелёк проекта — держатель основной эмиссии.
  wallet: process.env.NEXT_PUBLIC_REAL_WALLET?.trim() || "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS",
  initialSupply: 100_000_000,
};

function clusterSuffix(cluster: Cluster): string {
  return cluster === "devnet" ? "?cluster=devnet" : "";
}

export function solscanTokenOf(token: TokenInfo): string {
  if (!token.mint) return "https://solscan.io/";
  return `https://solscan.io/token/${token.mint}${clusterSuffix(token.cluster)}`;
}

export function solscanHoldersOf(token: TokenInfo): string {
  if (!token.mint) return "https://solscan.io/";
  return `https://solscan.io/token/${token.mint}${clusterSuffix(token.cluster)}#holders`;
}

/** Ссылка на кошелёк-держатель (account) в нужной сети. */
export function solscanWalletOf(token: TokenInfo): string {
  if (!token.wallet) return "https://solscan.io/";
  return `https://solscan.io/account/${token.wallet}${clusterSuffix(token.cluster)}`;
}

export function solscanToken(): string {
  return solscanTokenOf(REAL);
}

/** По умолчанию ссылка на mainnet (REAL) — тот же токен, что жжёт бот в проде. */
export function solscanTx(sig: string, cluster: Cluster = REAL.cluster): string {
  return `https://solscan.io/tx/${sig}${clusterSuffix(cluster)}`;
}

/** Ссылка на держателей REAL-токена. */
export function solscanHolders(): string {
  return solscanHoldersOf(REAL);
}

async function rpc<T>(method: string, params: unknown[], endpoint: string = REAL.rpc): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

/** Текущий объём токена в обороте (uiAmount), напрямую из блокчейна. */
export async function fetchSupplyOf(token: TokenInfo): Promise<number> {
  if (!token.mint) throw new Error("mint не задан");
  const r = await rpc<{ value: { uiAmount: number | null } }>("getTokenSupply", [token.mint], token.rpc);
  return r.value.uiAmount ?? 0;
}

/** Текущий объём REAL-токена в обороте (uiAmount). */
export async function fetchSupply(): Promise<number> {
  return fetchSupplyOf(REAL);
}

/** Баланс токена $DOFFA у адреса (суммарно по его токен-аккаунтам). По умолчанию REAL. */
export async function fetchBalanceOf(owner: string, token: TokenInfo): Promise<number> {
  if (!token.mint) return 0;
  const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] }>(
    "getTokenAccountsByOwner",
    [owner, { mint: token.mint }, { encoding: "jsonParsed" }],
    token.rpc,
  );
  let total = 0;
  for (const acc of r.value ?? []) {
    total += acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
  }
  return total;
}

export async function fetchBalance(owner: string): Promise<number> {
  return fetchBalanceOf(owner, REAL);
}


/* ---------- Wallet providers ---------- */

type SignMessageResult = { signature: Uint8Array } | Uint8Array;

type StandardProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array, encoding: string) => Promise<SignMessageResult>;
};

type SolflareProvider = {
  isSolflare?: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publicKey: { toString: () => string } | null;
  signMessage?: (message: Uint8Array, encoding: string) => Promise<SignMessageResult>;
};

declare global {
  interface Window {
    phantom?: { solana?: StandardProvider };
    solana?: StandardProvider;
    solflare?: SolflareProvider;
    trustwallet?: { solana?: StandardProvider };
    backpack?: StandardProvider;
  }
}

export type WalletId = "phantom" | "solflare" | "trust" | "backpack";

/** Результат попытки подключить кошелёк. */
export type ConnectOutcome =
  | { status: "connected"; address: string }
  /** Мобильный браузер без инжекта: открыли deep-link в приложение кошелька. */
  | { status: "opened_app" }
  /** Десктоп без расширения: отправили на страницу установки. */
  | { status: "needs_install" }
  | { status: "cancelled" };

const PENDING_WALLET_KEY = "doffa_pending_wallet";

export function getPhantom(): StandardProvider | null {
  if (typeof window === "undefined") return null;
  const p = window.phantom?.solana ?? window.solana;
  return p?.isPhantom ? p : null;
}

export function getSolflare(): SolflareProvider | null {
  if (typeof window === "undefined") return null;
  return window.solflare?.isSolflare ? window.solflare : null;
}

export function getTrust(): StandardProvider | null {
  if (typeof window === "undefined") return null;
  return window.trustwallet?.solana ?? null;
}

export function getBackpack(): StandardProvider | null {
  if (typeof window === "undefined") return null;
  return window.backpack ?? null;
}

function getProvider(id: WalletId): StandardProvider | SolflareProvider | null {
  if (id === "phantom") return getPhantom();
  if (id === "solflare") return getSolflare();
  if (id === "trust") return getTrust();
  if (id === "backpack") return getBackpack();
  return null;
}

/** Телефон / планшет: в обычном Safari/Chrome провайдер кошелька обычно не инжектится. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform));
}

function installUrl(id: WalletId): string {
  if (id === "phantom") return "https://phantom.app/download";
  if (id === "solflare") return "https://solflare.com/download";
  if (id === "trust") return "https://trustwallet.com/download";
  return "https://backpack.app/download";
}

/**
 * Deep-link «открой эту страницу внутри in-app браузера кошелька».
 * Там уже есть инжект window.phantom / solflare — connect + signMessage работают как на ПК.
 */
function browseDeepLink(id: WalletId, pageUrl: string, refUrl: string): string {
  const encoded = encodeURIComponent(pageUrl);
  const ref = encodeURIComponent(refUrl);
  if (id === "phantom") return `https://phantom.app/ul/browse/${encoded}?ref=${ref}`;
  if (id === "solflare") return `https://solflare.com/ul/v1/browse/${encoded}?ref=${ref}`;
  if (id === "trust") return `https://link.trustwallet.com/open_url?coin_id=501&url=${encoded}`;
  return `https://backpack.app/ul/v1/browse/${encoded}?ref=${ref}`;
}

function rememberPendingWallet(id: WalletId): void {
  try {
    sessionStorage.setItem(PENDING_WALLET_KEY, id);
  } catch { /* private mode */ }
}

export function peekPendingWallet(): WalletId | null {
  try {
    const v = sessionStorage.getItem(PENDING_WALLET_KEY);
    if (v === "phantom" || v === "solflare" || v === "trust" || v === "backpack") return v;
  } catch { /* ignore */ }
  return null;
}

export function clearPendingWallet(): void {
  try {
    sessionStorage.removeItem(PENDING_WALLET_KEY);
  } catch { /* ignore */ }
}

/** Ждём, пока in-app браузер кошелька успеет инжектнуть провайдер. */
async function waitForProvider(id: WalletId, timeoutMs = 2500): Promise<StandardProvider | SolflareProvider | null> {
  const started = Date.now();
  let provider = getProvider(id);
  while (!provider && Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 120));
    provider = getProvider(id);
  }
  return provider;
}

/**
 * Подключает кошелёк.
 * — На ПК с расширением: обычный connect.
 * — На телефоне без инжекта: открывает приложение кошелька с этой же страницей
 *   (browse deep-link), чтобы войти прямо в приложении, а не на сайте «Скачать».
 */
export async function connectWalletById(id: string): Promise<string | null> {
  const outcome = await connectWalletDetailed(id as WalletId);
  return outcome.status === "connected" ? outcome.address : null;
}

export async function connectWalletDetailed(id: WalletId): Promise<ConnectOutcome> {
  if (typeof window === "undefined") return { status: "cancelled" };

  try {
    let provider = getProvider(id);
    if (!provider) provider = await waitForProvider(id, 800);

    if (!provider) {
      if (isMobileDevice()) {
        // Открываем текущий URL внутри приложения кошелька — там провайдер есть.
        rememberPendingWallet(id);
        const pageUrl = window.location.href;
        const refUrl = window.location.origin;
        // location.assign надёжнее, чем window.open: iOS блокирует попапы вне жеста.
        window.location.assign(browseDeepLink(id, pageUrl, refUrl));
        return { status: "opened_app" };
      }
      window.open(installUrl(id), "_blank", "noopener,noreferrer");
      return { status: "needs_install" };
    }

    if (id === "solflare") {
      const p = provider as SolflareProvider;
      await p.connect();
      const address = p.publicKey?.toString() ?? null;
      if (!address) return { status: "cancelled" };
      clearPendingWallet();
      return { status: "connected", address };
    }

    const r = await (provider as StandardProvider).connect();
    clearPendingWallet();
    return { status: "connected", address: r.publicKey.toString() };
  } catch {
    return { status: "cancelled" };
  }
}

export async function disconnectWalletById(id: string): Promise<void> {
  try {
    if (id === "phantom") await getPhantom()?.disconnect();
    else if (id === "solflare") await getSolflare()?.disconnect();
    else if (id === "trust") await getTrust()?.disconnect();
    else if (id === "backpack") await getBackpack()?.disconnect();
  } catch { /* ignore */ }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function extractSignature(res: SignMessageResult): Uint8Array {
  return res instanceof Uint8Array ? res : res.signature;
}

/** Просит кошелёк подписать текстовое сообщение (для входа без пароля). Возвращает подпись в base64. */
export async function signMessageById(id: string, message: string): Promise<string | null> {
  const bytes = new TextEncoder().encode(message);
  try {
    const provider = (await waitForProvider(id as WalletId, 2000)) ?? getProvider(id as WalletId);
    if (!provider?.signMessage) return null;
    const res = await provider.signMessage(bytes, "utf8");
    return bytesToBase64(extractSignature(res));
  } catch {
    return null; // пользователь отклонил подпись
  }
}
