// npm run token:keygen — создать ТЕСТОВЫЙ ключ для devnet.
//
// 🔴 Только devnet. На mainnet скрипт отказывается работать: боевой ключ
//    создаётся владельцем в его кошельке (Phantom и т.п.), а не скриптом в
//    репозитории. Ключ, созданный здесь, не предназначен для хранения денег.
//
// 🔒 Приватный ключ пишется в локальный файл и НЕ печатается в консоль.

import { existsSync, writeFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { CFG, IS_MAINNET, explorerAccount, fail } from "./config.js";

async function main(): Promise<void> {
  if (IS_MAINNET) {
    throw new Error(
      "⛔ token:keygen работает только на devnet.\n\n" +
        "   Для mainnet ключ владельца создаётся в кошельке (Phantom, Solflare,\n" +
        "   Ledger) и экспортируется вручную. Скрипт из репозитория не должен\n" +
        "   быть источником ключа, за которым стоят реальные деньги.",
    );
  }

  if (existsSync(CFG.keypairPath)) {
    throw new Error(
      `⛔ Файл уже существует: ${CFG.keypairPath}\n` +
        "   Перезаписывать не буду — так теряют ключи. Удали его сам, если уверен.",
    );
  }

  const kp = Keypair.generate();
  writeFileSync(CFG.keypairPath, JSON.stringify(Array.from(kp.secretKey)));

  console.log("\n✅ Тестовый ключ devnet создан.\n");
  console.log(`   Файл           : ${CFG.keypairPath} (в .gitignore)`);
  console.log(`   Публичный адрес: ${kp.publicKey.toBase58()}`);
  console.log(`   ${explorerAccount(kp.publicKey.toBase58())}`);
  console.log("\n🔒 Приватный ключ намеренно не выведен. Он только в файле.");
  console.log("\nДальше: npm run token:airdrop");
}

main().catch(fail);
