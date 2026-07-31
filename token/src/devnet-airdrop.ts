// npm run token:airdrop — получить тестовые SOL в devnet.
//
// 🔴 Только devnet. В mainnet бесплатных SOL не существует.

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  IS_MAINNET,
  assertCluster,
  connection,
  explorerAccount,
  fail,
  loadKeypair,
} from "./config.js";

async function main(): Promise<void> {
  if (IS_MAINNET) {
    throw new Error("⛔ Airdrop существует только в тестовых сетях. В mainnet пополняй кошелёк сам.");
  }

  const conn = connection();
  await assertCluster(conn);
  const kp = loadKeypair();

  const before = await conn.getBalance(kp.publicKey);
  console.log(`Адрес : ${kp.publicKey.toBase58()}`);
  console.log(`Баланс: ${(before / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  if (before >= 1 * LAMPORTS_PER_SOL) {
    console.log("✅ SOL уже достаточно, airdrop не нужен.");
    return;
  }

  console.log("Запрашиваю 2 SOL…");
  try {
    const sig = await conn.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    const bh = await conn.getLatestBlockhash();
    await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
    const after = await conn.getBalance(kp.publicKey);
    console.log(`\n✅ Получено. Баланс: ${(after / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  } catch (e) {
    // Публичный faucet devnet регулярно отдаёт rate-limit — это не наша ошибка.
    console.log(`\n⚠️  Airdrop не прошёл: ${e instanceof Error ? e.message : e}`);
    console.log("\n   Публичный faucet часто ограничивает запросы. Получи SOL вручную:");
    console.log("   https://faucet.solana.com  → выбери devnet → вставь адрес:");
    console.log(`   ${kp.publicKey.toBase58()}`);
    console.log(`\n   ${explorerAccount(kp.publicKey.toBase58())}`);
    process.exit(1);
  }
}

main().catch(fail);
