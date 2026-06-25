// Лёгкая интеграция с Solana без тяжёлых библиотек:
// читаем данные токена через публичный JSON-RPC и подключаем Phantom через
// встроенный в браузер провайдер.
//
// На сайте живут ДВА токена одновременно:
//   1) DEMO  — тест-токен на devnet. Его сжигает бот, сжигания видны вживую.
//              Бесплатно, для всех, доказывает что система работает.
//   2) REAL  — боевой токен на mainnet. Эмиссия 100 000 000, нетронут, ждёт
//              запуска. Сжигаться начнёт, когда закончим тесты на devnet.
//
// Переменные окружения Vercel (NEXT_PUBLIC_*):
//   DEMO (devnet, есть дефолты — менять не нужно):
//     NEXT_PUBLIC_SOLANA_CLUSTER = devnet
//     NEXT_PUBLIC_SOLANA_RPC     = https://api.devnet.solana.com
//     NEXT_PUBLIC_DOFFA_MINT     = FVERje4sz25gD1w4hTYV5VevSLPPDFhoNDHax1gvMVKU
//   REAL (mainnet, задать когда создадим боевой токен):
//     NEXT_PUBLIC_REAL_MINT      = <адрес боевого mainnet-токена>
//     NEXT_PUBLIC_REAL_RPC       = <RPC mainnet, по умолчанию публичный>

export type Cluster = "devnet" | "mainnet-beta";

export type TokenInfo = {
  /** demo — тест на devnet; real — боевой на mainnet. */
  kind: "demo" | "real";
  cluster: Cluster;
  rpc: string;
  /** Адрес mint. null — токен ещё не создан (REAL до запуска). */
  mint: string | null;
  /** Кошелёк-держатель токена (treasury). Для REAL — Phantom-адрес проекта. */
  wallet: string | null;
  /** Полная эмиссия — для расчёта «сожжено = выпуск − текущий объём». */
  initialSupply: number;
};

const DEMO_CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as Cluster) || "devnet";

/** DEMO-токен (devnet): живые сжигания, тот же mint, что сжигает бот. */
export const DEMO: TokenInfo = {
  kind: "demo",
  cluster: DEMO_CLUSTER,
  rpc:
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    (DEMO_CLUSTER === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com"),
  mint: process.env.NEXT_PUBLIC_DOFFA_MINT || "FVERje4sz25gD1w4hTYV5VevSLPPDFhoNDHax1gvMVKU",
  wallet: null,
  initialSupply: 100_000_000,
};

/** REAL-токен (mainnet): боевой, нетронут. mint=null пока токен не выпущен. */
export const REAL: TokenInfo = {
  kind: "real",
  cluster: "mainnet-beta",
  rpc: process.env.NEXT_PUBLIC_REAL_RPC || "https://api.mainnet-beta.solana.com",
  mint: process.env.NEXT_PUBLIC_REAL_MINT?.trim() || null,
  // Phantom-кошелёк проекта на mainnet — здесь будет лежать нетронутые 100 млн.
  // Это адрес КОШЕЛЬКА (держателя), не mint. Mint появится при выпуске токена.
  wallet: process.env.NEXT_PUBLIC_REAL_WALLET?.trim() || "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS",
  initialSupply: 100_000_000,
};

/** Совместимость со старым кодом: CHAIN = DEMO (живой дашборд сжиганий). */
export const CHAIN = DEMO;

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
  return solscanTokenOf(DEMO);
}

export function solscanTx(sig: string): string {
  return `https://solscan.io/tx/${sig}${clusterSuffix(DEMO.cluster)}`;
}

/** Ссылка на держателей DEMO-токена — там виден кошелёк Burn Reserve и сжигания. */
export function solscanHolders(): string {
  return solscanHoldersOf(DEMO);
}

async function rpc<T>(method: string, params: unknown[], endpoint: string = DEMO.rpc): Promise<T> {
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

/** Текущий объём DEMO-токена в обороте (uiAmount). */
export async function fetchSupply(): Promise<number> {
  return fetchSupplyOf(DEMO);
}

/** Баланс DEMO-токена $DOFFA у адреса (суммарно по его токен-аккаунтам). */
export async function fetchBalance(owner: string): Promise<number> {
  if (!DEMO.mint) return 0;
  const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] }>(
    "getTokenAccountsByOwner",
    [owner, { mint: DEMO.mint }, { encoding: "jsonParsed" }],
    DEMO.rpc,
  );
  let total = 0;
  for (const acc of r.value ?? []) {
    total += acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
  }
  return total;
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

function burnedFromTx(tx: SolTx): number {
  if (!tx?.meta) return 0;
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const preSum = pre.filter((b) => b.mint === DEMO.mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  const postSum = post.filter((b) => b.mint === DEMO.mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  return Math.max(preSum - postSum, 0);
}

/**
 * Последние сожжения с on-chain мемо "DOFFA coffee burn | sale_id | receipt_hash".
 * Читает напрямую из блокчейна — данные невозможно подделать на уровне сайта.
 */
export async function fetchBurnHistory(limit = 15): Promise<BurnRecord[]> {
  if (!DEMO.mint) return [];
  type SigInfo = { signature: string; slot: number; blockTime: number | null };
  const sigs = await rpc<SigInfo[]>("getSignaturesForAddress", [DEMO.mint, { limit: 50 }], DEMO.rpc);

  // Параллельно загружаем транзакции, чтобы не ждать по одной
  const txResults = await Promise.allSettled(
    sigs.map((s) =>
      rpc<SolTx>("getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]).then((tx) => ({ sig: s.signature, blockTime: s.blockTime, tx })),
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
    const amount = burnedFromTx(tx);

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
