// Шаг 4. Сжигаем токены (за проданные чашки) с on-chain мемо для публичного аудита.
// Мемо-формат: "DOFFA coffee burn | sale_id | receipt_hash"
// Это привязывает каждое сжигание к конкретной продаже — данные проверяемы в Solscan.
//
// Пример: npm run burn -- 1 "sale_20240618_001" "a1b2c3d4"
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
import { CFG, loadKeypair, connection, resolveMint, explorerUrl } from "./config.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const [qtyArg, saleIdArg, hashArg] = process.argv.slice(2);
const human = Number(qtyArg);

if (!Number.isFinite(human) || human <= 0) {
  console.error("⛔ Укажи количество и (опционально) sale_id и receipt_hash.");
  console.error("   Пример: npm run burn -- 1 sale_001 abc12345");
  process.exit(1);
}

const keypair = loadKeypair();
const conn = connection();
const mint = resolveMint();
const amount = BigInt(Math.round(human)) * 10n ** BigInt(CFG.decimals);

const tokenAccount = await getAssociatedTokenAddress(mint, keypair.publicKey);

// Если sale_id не указан — генерируем автоматически (ручное сжигание)
const saleId   = saleIdArg ?? `manual-${Date.now()}`;
const receiptHash = hashArg ?? "no-pos-hash";
const memoText = `DOFFA coffee burn | ${saleId} | ${receiptHash}`;

const tx = new Transaction();

// 1. Инструкция сжигания SPL-токена (стандартный burn, не требует mint authority)
tx.add(
  createBurnInstruction(
    tokenAccount,       // токен-аккаунт владельца
    mint,               // минт
    keypair.publicKey,  // authority (владелец токен-аккаунта)
    amount,             // количество в базовых единицах
    [],
    TOKEN_PROGRAM_ID,
  ),
);

// 2. Мемо-инструкция — привязывает burn к конкретной продаже (публично в блокчейне)
tx.add(
  new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(memoText, "utf8"),
  }),
);

console.log(`\nСеть:      ${CFG.cluster}`);
console.log(`Сжигаю:    ${human} ${CFG.symbol}`);
console.log(`Memo:      ${memoText}\n`);

const sig = await sendAndConfirmTransaction(conn, tx, [keypair], {
  commitment: "confirmed",
});

console.log("🔥 Готово.");
console.log("   TX:      ", sig);
console.log("   Solscan: ", explorerUrl(resolveMint().toBase58()));
console.log("\n   Burn-запись появится в дашборде на сайте автоматически (из блокчейна).");
