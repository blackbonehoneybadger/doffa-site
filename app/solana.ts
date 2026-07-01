// Лёгкая интеграция с Solana без тяжёлых библиотек:
// читаем данные токена через публичный JSON-RPC и подключаем Phantom через
// встроенный в браузер провайдер.
//
// $DOFFA выпущен на mainnet: эмиссия 100 000 000, mint/freeze authority
// отозваны навсегда. Бот сжигает этот же токен за каждую проданную чашку.
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
  /** Полная эмиссия — для расчёта «сожжено = выпуск − текущий объём». */
  initialSupply: number;
};

/** $DOFFA на mainnet — боевой токен, тот же, что жжёт бот. */
export const REAL: TokenInfo = {
  cluster: "mainnet-beta",
  rpc: process.env.NEXT_PUBLIC_REAL_RPC || "https://api.mainnet-beta.solana.com",
  mint: process.env.NEXT_PUBLIC_REAL_MINT?.trim() || null,
  // Phantom-кошелёк проекта — держатель эмиссии до/во время сжиганий.
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

/* ---------- Burn history from on-chain memos ---------- */

export const BURN_MEMO_PREFIX = "DOFFA coffee burn |";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_PROGRAM_V1 = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

export type BurnRecord = {
  sig: string;
  blockTime: number | null;
  amount: number;   // токенов сожжено (UI amount)
  saleId: string;
  receiptHash: string;
  rawMemo: string;
};

type TxIx = {
  programId: string;
  parsed?: string | Record<string, unknown>;
  data?: string;
  accounts?: string[];
};

type TxMeta = {
  preTokenBalances?: { mint: string; uiTokenAmount: { uiAmount: number | null } }[];
  postTokenBalances?: { mint: string; uiTokenAmount: { uiAmount: number | null } }[];
  innerInstructions?: { index: number; instructions: TxIx[] }[];
} | null;

type SolTx = {
  blockTime: number | null;
  meta: TxMeta;
  transaction: { message: { instructions: TxIx[] } };
} | null;

function extractMemo(tx: SolTx): string {
  if (!tx) return "";
  const allIxs: TxIx[] = [
    ...(tx.transaction.message.instructions ?? []),
    ...(tx.meta?.innerInstructions?.flatMap((ii) => ii.instructions) ?? []),
  ];
  for (const ix of allIxs) {
    if (ix.programId !== MEMO_PROGRAM && ix.programId !== MEMO_PROGRAM_V1) continue;
    if (typeof ix.parsed === "string") return ix.parsed;
    // fallback: base64-decode ix.data
    if (typeof ix.data === "string") {
      try {
        // ix.data is base58 or base64 depending on encoding
        return Buffer.from(ix.data, "base64").toString("utf8");
      } catch {
        return ix.data;
      }
    }
  }
  return "";
}

function burnedFromTx(tx: SolTx, mint: string): number {
  if (!tx?.meta) return 0;
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const preSum = pre.filter((b) => b.mint === mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  const postSum = post.filter((b) => b.mint === mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  return Math.max(preSum - postSum, 0);
}

/**
 * Последние сожжения с on-chain мемо "DOFFA coffee burn | sale_id | receipt_hash".
 * Читает напрямую из блокчейна — данные невозможно подделать на уровне сайта.
 * По умолчанию читает REAL (боевой mainnet-токен, тот же, что жжёт бот).
 */
export async function fetchBurnHistoryOf(token: TokenInfo, limit = 15): Promise<BurnRecord[]> {
  if (!token.mint) return [];
  const mint = token.mint;
  type SigInfo = { signature: string; slot: number; blockTime: number | null };
  const sigs = await rpc<SigInfo[]>("getSignaturesForAddress", [mint, { limit: 50 }], token.rpc);

  // Параллельно загружаем транзакции, чтобы не ждать по одной
  const txResults = await Promise.allSettled(
    sigs.map((s) =>
      rpc<SolTx>("getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ], token.rpc).then((tx) => ({ sig: s.signature, blockTime: s.blockTime, tx })),
    ),
  );

  const records: BurnRecord[] = [];

  for (const r of txResults) {
    if (r.status !== "fulfilled") continue;
    const { sig, blockTime, tx } = r.value;
    if (!tx) continue;

    const memo = extractMemo(tx);
    if (!memo.startsWith(BURN_MEMO_PREFIX)) continue;

    const parts = memo.split("|").map((p) => p.trim());
    const amount = burnedFromTx(tx, mint);

    records.push({
      sig,
      blockTime: blockTime ?? tx.blockTime,
      amount,
      saleId: (parts[1] ?? "").replace(/^sale#/, ""),
      receiptHash: parts[2] ?? "",
      rawMemo: memo,
    });

    if (records.length >= limit) break;
  }

  return records;
}

/** История сжиганий REAL-токена (mainnet) — тот же токен, что жжёт бот в проде. */
export async function fetchBurnHistory(limit = 15): Promise<BurnRecord[]> {
  return fetchBurnHistoryOf(REAL, limit);
}

/* ---------- Wallet providers ---------- */

type StandardProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
};

type SolflareProvider = {
  isSolflare?: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publicKey: { toString: () => string } | null;
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

export async function connectWalletById(id: string): Promise<string | null> {
  try {
    if (id === "phantom") {
      const p = getPhantom();
      if (!p) { window.open("https://phantom.app/", "_blank", "noopener,noreferrer"); return null; }
      const r = await p.connect();
      return r.publicKey.toString();
    }
    if (id === "solflare") {
      const p = getSolflare();
      if (!p) { window.open("https://solflare.com/", "_blank", "noopener,noreferrer"); return null; }
      await p.connect();
      return p.publicKey?.toString() ?? null;
    }
    if (id === "trust") {
      const p = getTrust();
      if (!p) { window.open("https://trustwallet.com/", "_blank", "noopener,noreferrer"); return null; }
      const r = await p.connect();
      return r.publicKey.toString();
    }
    if (id === "backpack") {
      const p = getBackpack();
      if (!p) { window.open("https://backpack.app/", "_blank", "noopener,noreferrer"); return null; }
      const r = await p.connect();
      return r.publicKey.toString();
    }
  } catch { /* user declined */ }
  return null;
}

export async function disconnectWalletById(id: string): Promise<void> {
  try {
    if (id === "phantom") await getPhantom()?.disconnect();
    else if (id === "solflare") await getSolflare()?.disconnect();
    else if (id === "trust") await getTrust()?.disconnect();
    else if (id === "backpack") await getBackpack()?.disconnect();
  } catch { /* ignore */ }
}
