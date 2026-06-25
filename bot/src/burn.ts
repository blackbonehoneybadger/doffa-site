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
  const rpc = process.env.SOLANA_RPC?.trim() || "https://api.mainnet-beta.solana.com";
  const isDevnet = rpc.includes("devnet");
  const conn = new Connection(rpc, "confirmed");
  const keypair = loadKeypair();
  const mint = new PublicKey(CONFIG.mint);

  const tokenAccount = await getAssociatedTokenAddress(mint, keypair.publicKey);
  const amount = BigInt(args.qty) * 10n ** BigInt(DECIMALS);

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

  const sig = await sendAndConfirmTransaction(conn, tx, [keypair], {
    commitment: "confirmed",
  });

  const clusterParam = isDevnet ? "?cluster=devnet" : "";
  return {
    sig,
    solscan: `https://solscan.io/tx/${sig}${clusterParam}`,
  };
}

/** Проверяет, настроен ли burn (есть ли OWNER_KEYPAIR). */
export function isBurnConfigured(): boolean {
  return Boolean(process.env.OWNER_KEYPAIR?.trim());
}
