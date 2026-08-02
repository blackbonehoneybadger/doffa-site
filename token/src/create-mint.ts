// npm run token:create — создать новый mint токена DOFFA.
//
// Создаёт ТОЛЬКО сам mint: ни одного токена ещё не выпущено, supply = 0.
// mint authority и freeze authority остаются у подписанта — они понадобятся
// для выпуска эмиссии и отзываются в самом конце, отдельной командой.
//
// ⚠️ Повторный запуск создаёт ВТОРОЙ токен, а не переиспользует первый.
//    Поэтому при уже существующем deploy-output скрипт останавливается.

import { createMint } from "@solana/spl-token";
import {
  CFG,
  IS_MAINNET,
  TARGET,
  assertCluster,
  assertSignerIsOwner,
  assertSolBalance,
  assertTokenParams,
  connection,
  explorerToken,
  explorerTx,
  fail,
  loadKeypair,
  ownerWallet,
  printHeader,
  readDeploy,
  writeDeploy,
} from "./config.js";

async function main(): Promise<void> {
  assertTokenParams();
  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const owner = ownerWallet();
  assertSignerIsOwner(signer.publicKey);

  // Защита от случайного второго токена.
  const existing = readDeploy();
  if (existing?.mint) {
    throw new Error(
      `⛔ Для сети ${CFG.cluster} mint уже создан: ${existing.mint}\n\n` +
        "   Повторный запуск создал бы ВТОРОЙ независимый токен с тем же именем.\n" +
        "   Если это осознанное решение — удали token/deploy-output/" +
        `${CFG.cluster}.json и запусти снова.`,
    );
  }

  printHeader("СОЗДАНИЕ MINT (эмиссия пока НЕ выпускается, supply = 0)", {
    "Подписывает": signer.publicKey.toBase58(),
    "Название": `${TARGET.name} (${TARGET.symbol})`,
    "Decimals": String(TARGET.decimals),
    "mint authority": `${signer.publicKey.toBase58()} (отзовём в конце)`,
    "freeze authority": `${signer.publicKey.toBase58()} (отзовём в конце)`,
  });

  const sol = await assertSolBalance(conn, signer.publicKey);
  console.log(`Баланс подписанта: ${sol.toFixed(4)} SOL\n`);
  console.log("Создаю mint…");

  // createMint отправляет транзакцию и ждёт подтверждения.
  // decimals берём из TARGET, а не из .env: assertTokenParams уже проверил
  // их совпадение, но источником истины должна быть константа.
  const mint = await createMint(
    conn,
    signer,
    signer.publicKey, // mint authority
    signer.publicKey, // freeze authority
    TARGET.decimals,
  );

  // Перечитываем состояние из сети, а не верим тому, что отправили.
  const info = await conn.getParsedAccountInfo(mint);
  const parsed = info.value?.data;
  if (!parsed || !("parsed" in parsed)) {
    throw new Error("Mint создан, но прочитать его из сети не удалось. Проверь вручную в explorer.");
  }
  const d = parsed.parsed.info as {
    decimals: number;
    supply: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  };

  if (d.decimals !== TARGET.decimals) {
    throw new Error(`⛔ decimals в сети ${d.decimals}, ожидалось ${TARGET.decimals}.`);
  }
  if (d.supply !== "0") {
    throw new Error(`⛔ supply сразу после создания должен быть 0, а в сети ${d.supply}.`);
  }

  const out = writeDeploy({ mint: mint.toBase58(), ownerWallet: owner.toBase58() });

  console.log("\n✅ Mint создан и проверен в сети.\n");
  console.log(`   Mint address : ${mint.toBase58()}`);
  console.log(`   decimals     : ${d.decimals}`);
  console.log(`   supply       : ${d.supply} (пусто, как и должно быть)`);
  console.log(`   mintAuthority: ${d.mintAuthority}`);
  console.log(`   freezeAuth   : ${d.freezeAuthority}`);
  console.log(`\n   ${explorerToken(mint.toBase58())}`);
  console.log(`\n   Записано в: token/deploy-output/${CFG.cluster}.json`);
  void explorerTx;
  void out;

  console.log("\nДальше по порядку:");
  console.log("   1. npm run token:account   — токен-аккаунт владельца");
  console.log("   2. npm run token:metadata  — имя, символ, логотип");
  console.log("   3. npm run token:mint      — выпуск 100 000 000");
  console.log("   4. npm run token:verify    — сверка всего с сетью");
  if (IS_MAINNET) {
    console.log("\n🔴 Это mainnet. Mint создан навсегда и удалить его нельзя.");
  }
}

main().catch(fail);
