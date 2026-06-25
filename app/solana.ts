// Лёгкая интеграция с Solana без тяжёлых библиотек:
// читаем данные токена через публичный JSON-RPC и подключаем Phantom через
// встроенный в браузер провайдер.
//
// Сеть и адрес токена настраиваются переменными окружения Vercel
// (NEXT_PUBLIC_*). По умолчанию — devnet тест-токен, тот же, что сжигает бот,
// чтобы сайт показывал реальные сжигания. Для mainnet задать на Vercel:
//   NEXT_PUBLIC_SOLANA_CLUSTER = mainnet-beta
//   NEXT_PUBLIC_SOLANA_RPC     = <платный RPC, напр. Helius>
//   NEXT_PUBLIC_DOFFA_MINT     = <адрес mainnet-токена>

const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as "devnet" | "mainnet-beta") || "devnet";

export const CHAIN = {
  cluster: CLUSTER,
  rpc:
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    (CLUSTER === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com"),
  // Адрес минта $DOFFA. По умолчанию — devnet тест-токен (совпадает с ботом).
  mint: process.env.NEXT_PUBLIC_DOFFA_MINT || "FVERje4sz25gD1w4hTYV5VevSLPPDFhoNDHax1gvMVKU",
  // Сколько всего было выпущено (для расчёта «сожжено = выпуск − текущий объём»).
  initialSupply: 100_000_000,
};

export function solscanToken(): string {
  const suffix = CHAIN.cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/token/${CHAIN.mint}${suffix}`;
}

export function solscanTx(sig: string): string {
  const suffix = CHAIN.cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${sig}${suffix}`;
}

/** Ссылка на держателей токена — там виден кошелёк Burn Reserve и все сжигания. */
export function solscanHolders(): string {
  const suffix = CHAIN.cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/token/${CHAIN.mint}${suffix}#holders`;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(CHAIN.rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

/** Текущий объём токена в обороте (uiAmount), напрямую из блокчейна. */
export async function fetchSupply(): Promise<number> {
  const r = await rpc<{ value: { uiAmount: number | null } }>("getTokenSupply", [CHAIN.mint]);
  return r.value.uiAmount ?? 0;
}

/** Баланс $DOFFA у конкретного адреса (суммарно по его токен-аккаунтам). */
export async function fetchBalance(owner: string): Promise<number> {
  const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] }>(
    "getTokenAccountsByOwner",
    [owner, { mint: CHAIN.mint }, { encoding: "jsonParsed" }],
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
  const preSum = pre.filter((b) => b.mint === CHAIN.mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  const postSum = post.filter((b) => b.mint === CHAIN.mint).reduce((s, b) => s + (b.uiTokenAmount.uiAmount ?? 0), 0);
  return Math.max(preSum - postSum, 0);
}

/**
 * Последние сожжения с on-chain мемо "DOFFA coffee burn | sale_id | receipt_hash".
 * Читает напрямую из блокчейна — данные невозможно подделать на уровне сайта.
 */
export async function fetchBurnHistory(limit = 15): Promise<BurnRecord[]> {
  type SigInfo = { signature: string; slot: number; blockTime: number | null };
  const sigs = await rpc<SigInfo[]>("getSignaturesForAddress", [CHAIN.mint, { limit: 50 }]);

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
      saleId: parts[1] ?? "",
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
