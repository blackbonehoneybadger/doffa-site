// npm run token:burn -- <количество>
//
// Реальное сжигание SPL: уменьшает supply в сети. Именно этим сжигание
// отличается от отправки на «мёртвый» адрес — там токены остаются в supply,
// а здесь исчезают, и это проверяется через getTokenSupply без доверия к нам.
//
// 🔴 НЕОБРАТИМО. Сожжённое не восстановить: mint authority к тому моменту
//    отозван, а значит выпустить взамен нельзя даже владельцу.

import { burn, getMint } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createInterface } from "node:readline/promises";
import {
  IS_MAINNET,
  TARGET,
  assertCluster,
  assertSignerIsOwner,
  assertSolBalance,
  assertTokenParams,
  connection,
  explorerTx,
  fail,
  formatBaseUnits,
  loadKeypair,
  ownerWallet,
  parseTokenAmount,
  printHeader,
  resolveMint,
  writeDeploy,
} from "./config.js";

async function main(): Promise<void> {
  assertTokenParams();

  const arg = process.argv[2]?.trim();
  if (!arg) {
    throw new Error(
      "Укажи количество:\n" +
        "   npm run token:burn -- 1000\n" +
        "   npm run token:burn -- 12.5",
    );
  }
  const amountBase = parseTokenAmount(arg);
  if (amountBase <= 0n) throw new Error("Количество должно быть больше нуля.");

  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const owner = ownerWallet();
  const mint = resolveMint();
  assertSignerIsOwner(signer.publicKey);

  const before = await getMint(conn, mint);
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const balBefore = BigInt((await conn.getTokenAccountBalance(ata)).value.amount);

  if (amountBase > balBefore) {
    throw new Error(
      `⛔ Недостаточно токенов.\n` +
        `   Сжечь просят: ${formatBaseUnits(amountBase)} ${TARGET.symbol}\n` +
        `   На балансе:   ${formatBaseUnits(balBefore)} ${TARGET.symbol}`,
    );
  }

  printHeader("🔴 СЖИГАНИЕ ТОКЕНОВ — НЕОБРАТИМО", {
    "Подписывает": signer.publicKey.toBase58(),
    "Mint": mint.toBase58(),
    "Со счёта": ata.toBase58(),
    "Сжечь": `${formatBaseUnits(amountBase)} ${TARGET.symbol}`,
    "supply сейчас": formatBaseUnits(before.supply),
    "supply станет": formatBaseUnits(before.supply - amountBase),
  });

  if (IS_MAINNET) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Введи точно «BURN ${arg}» для продолжения:\n> `);
    rl.close();
    if (answer.trim() !== `BURN ${arg}`) {
      throw new Error("Подтверждение не совпало. Ничего не сожжено.");
    }
    console.log("");
  }

  await assertSolBalance(conn, signer.publicKey, 0.002);
  console.log("Сжигаю…");

  const sig = await burn(conn, signer, ata, mint, signer, amountBase);

  // Сверяем из сети: supply и баланс должны уменьшиться ровно на сумму.
  const after = await getMint(conn, mint);
  const balAfter = BigInt((await conn.getTokenAccountBalance(ata)).value.amount);

  const problems: string[] = [];
  if (after.supply !== before.supply - amountBase) {
    problems.push(`supply ${after.supply}, ожидалось ${before.supply - amountBase}`);
  }
  if (balAfter !== balBefore - amountBase) {
    problems.push(`баланс ${balAfter}, ожидалось ${balBefore - amountBase}`);
  }
  if (problems.length) {
    throw new Error(`⛔ Результат сжигания не сошёлся:\n   ${problems.join("\n   ")}\n\n   ${explorerTx(sig)}`);
  }

  const prev = (await import("./config.js")).readDeploy();
  writeDeploy({ signatures: { [`burn_${Object.keys(prev?.signatures ?? {}).length}`]: sig } });

  console.log("\n✅ Сожжено и сверено с сетью.\n");
  console.log(`   Сожжено      : ${formatBaseUnits(amountBase)} ${TARGET.symbol}`);
  console.log(`   supply было  : ${formatBaseUnits(before.supply)}`);
  console.log(`   supply стало : ${formatBaseUnits(after.supply)}`);
  console.log(`   баланс стал  : ${formatBaseUnits(balAfter)}`);
  console.log(`\n   ${explorerTx(sig)}`);
}

main().catch(fail);
