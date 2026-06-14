// Шаг 2 (только devnet). Запрашиваем тестовые SOL, чтобы платить комиссии сети.
// На mainnet этот шаг не нужен — туда SOL покупаются/переводятся по-настоящему.
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CFG, connection, loadKeypair } from "./config.js";

if (CFG.cluster !== "devnet") {
  console.error("⛔ Airdrop доступен только в devnet. Сейчас CLUSTER =", CFG.cluster);
  process.exit(1);
}

const conn = connection();
const owner = loadKeypair();

console.log("Запрашиваю 2 SOL (devnet) на адрес", owner.publicKey.toBase58(), "...");
const sig = await conn.requestAirdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
await conn.confirmTransaction(sig, "confirmed");

const bal = await conn.getBalance(owner.publicKey);
console.log("✅ Готово. Баланс:", bal / LAMPORTS_PER_SOL, "SOL");
console.log("   Подпись:", sig);
