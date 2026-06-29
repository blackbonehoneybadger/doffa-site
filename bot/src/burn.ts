// Автоматическое сжигание $DOFFA на Solana при каждой продаже в боте.
// Нужна переменная OWNER_KEYPAIR (JSON-массив байт секретного ключа).
// Если ключ не задан — бот работает как обычная касса (burn pending).
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createBurnInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { CONFIG } from "./config.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DECIMALS = 6; // $DOFFA: 6 десятичных знаков

// --- Сеть: единая точка истины -------------------------------------------
// По умолчанию devnet (тест, бесплатно). На mainnet перейдём, задав SOLANA_RPC.
// Важно: SOLANA_RPC и DOFFA_MINT должны указывать на ОДНУ сеть — иначе burn
// упадёт с «found no record of a prior credit» (токена нет в этой сети).
export function getRpc(): string {
  return process.env.SOLANA_RPC?.trim() || "https://api.devnet.solana.com";
}

// Сеть определяем ЯВНО через SOLANA_CLUSTER (devnet|mainnet). Если не задано —
// откатываемся на эвристику по URL. Явная переменная надёжнее: многие mainnet
// RPC (Helius/QuickNode/свои домены) не содержат слов «mainnet»/«devnet».
export function clusterName(): "devnet" | "mainnet" {
  const explicit = process.env.SOLANA_CLUSTER?.trim().toLowerCase();
  if (explicit === "devnet" || explicit === "mainnet") return explicit;
  return getRpc().includes("devnet") ? "devnet" : "mainnet";
}

export function isDevnet(): boolean {
  return clusterName() === "devnet";
}

function clusterParam(): string {
  return isDevnet() ? "?cluster=devnet" : "";
}

export function solscanTx(sig: string): string {
  return `https://solscan.io/tx/${sig}${clusterParam()}`;
}

function loadKeypair(): Keypair {
  const raw = process.env.OWNER_KEYPAIR?.trim();
  if (!raw) throw new Error("OWNER_KEYPAIR не задан");
  const bytes = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export type BurnResult = {
  sig: string;
  solscan: string;
};

/** Проверяет, настроен ли burn (есть ли OWNER_KEYPAIR). */
export function isBurnConfigured(): boolean {
  return Boolean(process.env.OWNER_KEYPAIR?.trim());
}

export type Preflight = {
  ok: boolean;
  cluster: "devnet" | "mainnet";
  rpc: string;
  mint: string;
  pubkey?: string;
  sol?: number;
  tokenBalance?: string;
  ata?: string;
  error?: string;
};

/**
 * Самопроверка при старте: есть ли SOL и токены на кошельке в ТЕКУЩЕЙ сети.
 * Ничего не ломает — только читает и возвращает диагностику для логов.
 */
export async function preflight(): Promise<Preflight> {
  const cluster = clusterName();
  const rpc = getRpc();
  const mint = CONFIG.mint;
  if (!isBurnConfigured()) {
    return { ok: false, cluster, rpc, mint, error: "OWNER_KEYPAIR не задан" };
  }
  try {
    const conn = new Connection(rpc, "confirmed");
    const kp = loadKeypair();
    const sol = await conn.getBalance(kp.publicKey);
    const ata = await getAssociatedTokenAddress(new PublicKey(mint), kp.publicKey);
    const bal = await conn.getTokenAccountBalance(ata).catch(() => null);
    const hasTokens = bal !== null && BigInt(bal.value.amount) > 0n;
    return {
      ok: sol > 0 && hasTokens,
      cluster,
      rpc,
      mint,
      pubkey: kp.publicKey.toBase58(),
      sol: sol / 1e9,
      tokenBalance: bal ? bal.value.uiAmountString ?? "0" : "аккаунт не найден",
      ata: ata.toBase58(),
    };
  } catch (e) {
    return { ok: false, cluster, rpc, mint, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Сжигает qty токенов $DOFFA с мемо-ссылкой на продажу.
 * Memo-формат: "DOFFA coffee burn | sale#N | receiptHash"
 * Запись навсегда остаётся в Solana — проверяется в Solscan.
 */
export async function burnCoffee(args: {
  qty: number;
  saleId: number;
  receiptHash: string;
}): Promise<BurnResult> {
  const conn = new Connection(getRpc(), "confirmed");
  const keypair = loadKeypair();
  const mint = new PublicKey(CONFIG.mint);

  const tokenAccount = await getAssociatedTokenAddress(mint, keypair.publicKey);
  const amount = BigInt(args.qty) * 10n ** BigInt(DECIMALS);

  // Преполётная проверка — даём ПОНЯТНУЮ ошибку вместо сырого Solana-симулятора.
  const balInfo = await conn.getTokenAccountBalance(tokenAccount).catch(() => null);
  if (balInfo === null) {
    throw new Error(
      `Кошелёк ${keypair.publicKey.toBase58().slice(0, 6)}… не держит этот токен в сети ${clusterName()}. ` +
        `Проверь, что SOLANA_RPC и DOFFA_MINT указывают на ОДНУ сеть.`,
    );
  }
  if (BigInt(balInfo.value.amount) < amount) {
    throw new Error(
      `Недостаточно $DOFFA: на кошельке ${balInfo.value.uiAmountString}, нужно ${args.qty}.`,
    );
  }

  // Мемо: привязывает burn к конкретной продаже (публично в Solscan)
  const memoText = `DOFFA coffee burn | sale#${args.saleId} | ${args.receiptHash}`;

  const tx = new Transaction();

  // 1. SPL burn instruction — стандартное сжигание токена
  tx.add(
    createBurnInstruction(
      tokenAccount,
      mint,
      keypair.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  // 2. Memo instruction — on-chain доказательство привязки к продаже
  tx.add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(memoText, "utf8"),
    }),
  );

  try {
    const sig = await sendAndConfirmTransaction(conn, tx, [keypair], {
      commitment: "confirmed",
    });
    return { sig, solscan: solscanTx(sig) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Классическая ошибка несовпадения сети — переводим на человеческий.
    if (msg.includes("found no record of a prior credit")) {
      throw new Error(
        `Сеть и токен не совпадают: кошелёк пуст в сети ${clusterName()}. ` +
          `Убедись, что SOLANA_RPC и DOFFA_MINT — оба про одну сеть (devnet или mainnet).`,
      );
    }
    throw err;
  }
}
