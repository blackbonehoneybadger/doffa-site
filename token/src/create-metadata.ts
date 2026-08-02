// npm run token:metadata — привязать к mint имя, символ и логотип.
//
// Метаданные лежат не в самом mint, а в отдельном аккаунте программы Metaplex
// Token Metadata, адрес которого выводится из mint. Кошельки и explorer'ы
// читают имя и логотип именно оттуда.
//
// ⚠️ URI обязан быть постоянным (IPFS/Arweave). После отзыва authority
//    переписать его нельзя, и временная ссылка означает токен без логотипа
//    навсегда.

import { createV1, TokenStandard, fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";
import { percentAmount, publicKey } from "@metaplex-foundation/umi";
import {
  CFG,
  TARGET,
  assertCluster,
  assertSignerIsOwner,
  assertSolBalance,
  assertTokenParams,
  connection,
  explorerToken,
  fail,
  loadKeypair,
  makeUmi,
  printHeader,
  resolveMint,
  writeDeploy,
} from "./config.js";

/** Временные хостинги, которые нельзя использовать как постоянный URI. */
const TEMPORARY = /vercel\.app|netlify\.app|ngrok|localhost|127\.0\.0\.1|herokuapp/i;

async function main(): Promise<void> {
  assertTokenParams();

  if (!CFG.metadataUri) {
    throw new Error(
      "⛔ DOFFA_METADATA_URI пуст.\n\n" +
        "   Сначала загрузи logo.png и doffa.json в постоянное хранилище\n" +
        "   (IPFS или Arweave) и укажи ссылку на JSON в .env\n" +
        "   Заготовки: token/metadata/",
    );
  }
  if (TEMPORARY.test(CFG.metadataUri)) {
    throw new Error(
      `⛔ URI выглядит временным: ${CFG.metadataUri}\n\n` +
        "   После отзыва authority этот адрес не переписать. Если хостинг\n" +
        "   исчезнет, токен навсегда останется без имени и логотипа.\n" +
        "   Нужен IPFS или Arweave.",
    );
  }

  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const mint = resolveMint();
  assertSignerIsOwner(signer.publicKey);

  printHeader("МЕТАДАННЫЕ ТОКЕНА", {
    "Подписывает": signer.publicKey.toBase58(),
    "Mint": mint.toBase58(),
    "Name": TARGET.name,
    "Symbol": TARGET.symbol,
    "URI": CFG.metadataUri,
  });

  await assertSolBalance(conn, signer.publicKey);

  const umi = makeUmi();
  const mintPk = publicKey(mint.toBase58());

  // Уже есть?
  try {
    const existing = await fetchMetadataFromSeeds(umi, { mint: mintPk });
    throw new Error(
      `⛔ Метаданные для этого mint уже созданы.\n` +
        `   name: ${existing.name}\n   symbol: ${existing.symbol}\n   uri: ${existing.uri}\n\n` +
        "   Повторное создание невозможно. Для изменения нужен update authority\n" +
        "   и отдельная операция update.",
    );
  } catch (e) {
    // Метаданных нет — это ожидаемый путь, идём дальше.
    if (e instanceof Error && e.message.startsWith("⛔")) throw e;
  }

  console.log("Создаю аккаунт метаданных…");

  await createV1(umi, {
    mint: mintPk,
    authority: umi.identity,
    name: TARGET.name,
    symbol: TARGET.symbol,
    uri: CFG.metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  // Перечитываем из сети.
  const meta = await fetchMetadataFromSeeds(umi, { mint: mintPk });
  const problems: string[] = [];
  if (meta.name.replace(/\0/g, "") !== TARGET.name) problems.push(`name «${meta.name}» ≠ «${TARGET.name}»`);
  if (meta.symbol.replace(/\0/g, "") !== TARGET.symbol) problems.push(`symbol «${meta.symbol}» ≠ «${TARGET.symbol}»`);
  if (meta.uri.replace(/\0/g, "") !== CFG.metadataUri) problems.push(`uri «${meta.uri}» ≠ «${CFG.metadataUri}»`);
  if (problems.length) {
    throw new Error(`⛔ Метаданные в сети не совпали с заданными:\n   ${problems.join("\n   ")}`);
  }

  writeDeploy({ metadataUri: CFG.metadataUri });

  console.log("\n✅ Метаданные созданы и сверены с сетью.\n");
  console.log(`   name  : ${meta.name.replace(/\0/g, "")}`);
  console.log(`   symbol: ${meta.symbol.replace(/\0/g, "")}`);
  console.log(`   uri   : ${meta.uri.replace(/\0/g, "")}`);
  console.log(`\n   ${explorerToken(mint.toBase58())}`);
  console.log("\nОткрой ссылку и убедись, что логотип и имя отображаются.");
  console.log("Дальше: npm run token:mint");
}

main().catch(fail);
