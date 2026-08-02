// npm run token:check-wallet
//
// Предполётная проверка перед любыми операциями с токеном. Ничего не создаёт,
// не подписывает и не тратит — только читает сеть и печатает, что увидел.
//
// 🔒 Приватный ключ не печатается. Наружу идёт только публичный адрес.

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  CFG,
  IS_MAINNET,
  TARGET,
  assertCluster,
  assertTokenParams,
  connection,
  explorerAccount,
  fail,
  loadKeypair,
  ownerWallet,
  printHeader,
  readDeploy,
  rpcEndpoint,
} from "./config.js";

async function main(): Promise<void> {
  printHeader("ПРОВЕРКА КОШЕЛЬКА И КОНФИГУРАЦИИ (ничего не изменяется)");

  // 1. Параметры токена не разошлись с целевыми.
  assertTokenParams();
  console.log("✅ Параметры токена совпадают с целевыми:");
  console.log(`   ${TARGET.name} / ${TARGET.symbol}, decimals ${TARGET.decimals}, эмиссия ${TARGET.supply.toLocaleString("ru-RU")}\n`);

  // 2. Сеть отвечает и это действительно заявленная сеть.
  const conn = connection();
  await assertCluster(conn);
  console.log(`✅ Сеть подтверждена по genesis hash: ${CFG.cluster}`);
  console.log(`   RPC: ${rpcEndpoint()}\n`);

  // 3. Адрес владельца валиден.
  const owner = ownerWallet();
  console.log(`✅ Кошелёк владельца: ${owner.toBase58()}`);
  console.log(`   ${explorerAccount(owner.toBase58())}\n`);

  // 4. Ключ подписанта — есть ли он и тот ли это кошелёк.
  let signerOk = false;
  try {
    const signer = loadKeypair().publicKey;
    const isOwner = signer.equals(owner);
    signerOk = true;
    console.log(`${isOwner ? "✅" : "⚠️ "} Ключ подписанта: ${signer.toBase58()}`);
    if (isOwner) {
      console.log("   Это и есть кошелёк владельца — верно для mainnet.\n");
    } else if (IS_MAINNET) {
      console.log("   ⛔ В mainnet подписывать должен САМ владелец. Выпуск будет заблокирован.\n");
    } else {
      console.log("   Тестовый ключ devnet. Эмиссия всё равно уйдёт на адрес владельца.\n");
    }
  } catch (e) {
    console.log(`⚠️  Ключ подписанта недоступен: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    console.log("   Для чтения это не нужно, но подписать транзакцию будет нечем.\n");
  }

  // 5. Баланс SOL владельца — хватит ли на комиссии.
  const lamports = await conn.getBalance(owner);
  const sol = lamports / LAMPORTS_PER_SOL;
  console.log(`${sol >= 0.05 ? "✅" : "⚠️ "} Баланс владельца: ${sol.toFixed(4)} SOL`);
  console.log("   Полный цикл (mint + ATA + метаданные + выпуск + отзыв) ≈ 0.01–0.02 SOL.\n");

  // 6. Метаданные готовы?
  if (!CFG.metadataUri) {
    console.log("⚠️  DOFFA_METADATA_URI пуст — метаданные ещё не загружены.");
    console.log("   Нужен постоянный URI (IPFS/Arweave). Временный URL использовать нельзя.\n");
  } else if (/vercel\.app|ngrok|localhost|127\.0\.0\.1/i.test(CFG.metadataUri)) {
    console.log(`⛔ DOFFA_METADATA_URI выглядит временным: ${CFG.metadataUri}`);
    console.log("   После отзыва authority этот URI не переписать — логотип пропадёт навсегда.\n");
  } else {
    console.log(`✅ Metadata URI: ${CFG.metadataUri}\n`);
  }

  // 7. Уже что-то выпущено в этой сети?
  const d = readDeploy();
  if (d?.mint) {
    console.log(`ℹ️  В сети ${CFG.cluster} уже есть выпущенный mint: ${d.mint}`);
    console.log("   Повторный token:create создаст ВТОРОЙ токен. Обычно это не то, что нужно.\n");
  } else {
    console.log(`ℹ️  Выпущенного mint для сети ${CFG.cluster} пока нет — чистый старт.\n`);
  }

  // Итог.
  const ready = signerOk && sol > 0 && (!IS_MAINNET || CFG.metadataUri !== "");
  console.log(ready ? "ГОТОВ к выпуску." : "НЕ ГОТОВ — закрой замечания выше.");
  if (IS_MAINNET) {
    console.log("\n🔴 Сеть боевая. Каждая следующая операция стоит реальных SOL и необратима.");
  }
}

main().catch(fail);
