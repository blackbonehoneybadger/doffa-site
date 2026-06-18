// Лёгкая интеграция с Solana без тяжёлых библиотек:
// читаем данные токена через публичный JSON-RPC и подключаем Phantom через
// встроенный в браузер провайдер. Сейчас всё на devnet (тест-токен).

export const CHAIN = {
  cluster: "devnet" as const,
  rpc: "https://api.devnet.solana.com",
  // Адрес тест-минта $DOFFA на devnet. На mainnet заменим на боевой.
  mint: "FVERje4sz25gD1w4hTYV5VevSLPPDFhoNDHax1gvMVKU",
  // Сколько всего было выпущено (для расчёта «сожжено = выпуск − текущий объём»).
  initialSupply: 100_000_000,
};

export function solscanToken(): string {
  const suffix = CHAIN.cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/token/${CHAIN.mint}${suffix}`;
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

type PhantomProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
};

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { phantom?: { solana?: PhantomProvider }; solana?: PhantomProvider };
  const p = w.phantom?.solana ?? w.solana;
  return p?.isPhantom ? p : null;
}
