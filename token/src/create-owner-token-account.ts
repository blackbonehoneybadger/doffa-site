// npm run token:account — создать Associated Token Account (ATA) владельца.
//
// ATA — технический счёт, на котором лежат токены конкретного mint у
// конкретного кошелька. Это НЕ дополнительный пользовательский кошелёк:
// его адрес однозначно выводится из пары (владелец, mint) и управляется тем же
// ключом владельца. Отдельного ключа у него нет и быть не может.
//
// Операция идемпотентна: если ATA уже существует, ничего не создаётся.

import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import {
  CFG,
  assertCluster,
  assertSignerIsOwner,
  assertSolBalance,
  assertTokenParams,
  connection,
  explorerAccount,
  fail,
  formatBaseUnits,
  loadKeypair,
  ownerWallet,
  printHeader,
  resolveMint,
  writeDeploy,
} from "./config.js";

async function main(): Promise<void> {
  assertTokenParams();
  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const owner = ownerWallet();
  const mint = resolveMint();
  assertSignerIsOwner(signer.publicKey);

  printHeader("ТОКЕН-АККАУНТ ВЛАДЕЛЬЦА (ATA)", {
    "Подписывает": signer.publicKey.toBase58(),
    "Mint": mint.toBase58(),
    "Для кошелька": owner.toBase58(),
  });

  await assertSolBalance(conn, signer.publicKey);
  console.log("Проверяю / создаю ATA…");

  const ata = await getOrCreateAssociatedTokenAccount(conn, signer, mint, owner);

  // Перечитываем из сети.
  const bal = await conn.getTokenAccountBalance(ata.address);
  const base = BigInt(bal.value.amount);

  if (!ata.owner.equals(owner)) {
    throw new Error(
      `⛔ Владелец ATA не совпадает.\n` +
        `   В сети:   ${ata.owner.toBase58()}\n` +
        `   Ожидался: ${owner.toBase58()}`,
    );
  }
  if (!ata.mint.equals(mint)) {
    throw new Error(`⛔ ATA относится к другому mint: ${ata.mint.toBase58()}`);
  }

  writeDeploy({ ownerTokenAccount: ata.address.toBase58() });

  console.log("\n✅ Токен-аккаунт владельца готов и проверен.\n");
  console.log(`   ATA          : ${ata.address.toBase58()}`);
  console.log(`   Владелец     : ${ata.owner.toBase58()}`);
  console.log(`   Mint         : ${ata.mint.toBase58()}`);
  console.log(`   Баланс       : ${formatBaseUnits(base)} ${CFG.symbol}`);
  console.log(`\n   ${explorerAccount(ata.address.toBase58())}`);
  console.log("\nДальше: npm run token:metadata");
}

main().catch(fail);
