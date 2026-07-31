// npm run token:mint — выпустить ровно 100 000 000 DOFFA на кошелёк владельца.
//
// Всё считается в BigInt: 100 000 000 токенов с 6 знаками — это 10^14 базовых
// единиц, что уже за границей безопасной точности double. Одна операция с
// плавающей точкой здесь тихо исказила бы эмиссию.
//
// Жёсткие правила:
//   • выпустить больше TARGET.supply нельзя;
//   • повторный запуск при непустом supply останавливается;
//   • после выпуска сверяем supply в сети И баланс владельца — оба должны
//     совпасть с целью до последней базовой единицы.

import { mintTo, getMint } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  CFG,
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
  printHeader,
  resolveMint,
  toBaseUnits,
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

  const targetBase = toBaseUnits(TARGET.supply);

  // Состояние ДО выпуска — читаем из сети.
  const before = await getMint(conn, mint);
  if (before.decimals !== TARGET.decimals) {
    throw new Error(`⛔ decimals в сети ${before.decimals}, ожидалось ${TARGET.decimals}.`);
  }
  if (before.mintAuthority === null) {
    throw new Error(
      "⛔ mint authority уже отозван — выпустить токены невозможно.\n" +
        "   Это необратимо. Если эмиссия не выпущена, токен придётся создавать заново.",
    );
  }
  if (!before.mintAuthority.equals(signer.publicKey)) {
    throw new Error(
      `⛔ mint authority принадлежит другому ключу.\n` +
        `   В сети:      ${before.mintAuthority.toBase58()}\n` +
        `   Подписывает: ${signer.publicKey.toBase58()}`,
    );
  }
  if (before.supply > 0n) {
    throw new Error(
      `⛔ Эмиссия уже выпущена: ${formatBaseUnits(before.supply)} ${CFG.symbol}.\n\n` +
        "   Повторный выпуск превысил бы заявленные 100 000 000 и сделал бы\n" +
        "   цифру на сайте ложью. Операция остановлена.",
    );
  }

  const ata = getAssociatedTokenAddressSync(mint, owner);

  printHeader("ВЫПУСК ЭМИССИИ", {
    "Подписывает": signer.publicKey.toBase58(),
    "Mint": mint.toBase58(),
    "Получатель": `${owner.toBase58()} (ATA ${ata.toBase58()})`,
    "Сумма": `${TARGET.supply.toLocaleString("ru-RU")} ${CFG.symbol}`,
    "В базовых единицах": targetBase.toString(),
  });

  await assertSolBalance(conn, signer.publicKey);
  console.log(`Выпускаю ${TARGET.supply.toLocaleString("ru-RU")} ${CFG.symbol}…`);

  const sig = await mintTo(conn, signer, mint, ata, signer, targetBase);

  // ── Проверка результата напрямую из сети ──────────────────────────────
  const after = await getMint(conn, mint);
  const bal = await conn.getTokenAccountBalance(ata);
  const balBase = BigInt(bal.value.amount);

  const problems: string[] = [];
  if (after.supply !== targetBase) {
    problems.push(`supply в сети ${after.supply}, ожидалось ${targetBase}`);
  }
  if (balBase !== targetBase) {
    problems.push(`баланс владельца ${balBase}, ожидалось ${targetBase}`);
  }
  if (problems.length) {
    throw new Error(
      `⛔ ЭМИССИЯ НЕ СОВПАЛА С ОЖИДАЕМОЙ:\n   ${problems.join("\n   ")}\n\n` +
        `   Транзакция: ${explorerTx(sig)}\n` +
        "   Не продолжай, пока не разберёшься.",
    );
  }

  writeDeploy({ signatures: { mintSupply: sig } });

  console.log("\n✅ Эмиссия выпущена и сверена с сетью.\n");
  console.log(`   supply в сети   : ${formatBaseUnits(after.supply)} ${CFG.symbol}`);
  console.log(`   баланс владельца: ${formatBaseUnits(balBase)} ${CFG.symbol}`);
  console.log(`   совпадение      : до последней базовой единицы`);
  console.log(`\n   Транзакция: ${sig}`);
  console.log(`   ${explorerTx(sig)}`);
  console.log("\nДальше: npm run token:verify — полная сверка перед отзывом полномочий.");
  if (IS_MAINNET) {
    console.log("\n🔴 mainnet: 100 000 000 DOFFA существуют. Ключ от кошелька владельца —");
    console.log("   единственное, что даёт к ним доступ. Проверь бэкап восстановлением.");
  }
}

main().catch(fail);
