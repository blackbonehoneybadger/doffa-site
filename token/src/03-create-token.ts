// Шаг 3. Выпускаем токен $DOFFA: создаём минт + метаданные (имя/символ/лого)
// и минтим весь объём владельцу. Это «фундамент» токена.
import { writeFileSync } from "node:fs";
import {
  createFungible,
  mintV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount, some } from "@metaplex-foundation/umi";
import { CFG, makeUmi, MINT_FILE, explorerUrl } from "./config.js";

if (!CFG.metadataUri) {
  console.error("⛔ METADATA_URI пуст. Укажи в .env ссылку на JSON-метаданные токена (лого/имя).");
  process.exit(1);
}

const umi = makeUmi();
const mint = generateSigner(umi);

console.log(`Сеть: ${CFG.cluster}`);
console.log(`Создаю токен ${CFG.name} (${CFG.symbol}), decimals=${CFG.decimals} ...`);

await createFungible(umi, {
  mint,
  name: CFG.name,
  symbol: CFG.symbol,
  uri: CFG.metadataUri,
  sellerFeeBasisPoints: percentAmount(0),
  decimals: some(CFG.decimals),
}).sendAndConfirm(umi);

const mintAddress = mint.publicKey.toString();
console.log("✅ Минт создан:", mintAddress);

// Минтим весь объём в базовых единицах (supply * 10^decimals) владельцу.
const amount = CFG.supply * 10n ** BigInt(CFG.decimals);
console.log(`Минчу ${CFG.supply.toString()} ${CFG.symbol} владельцу ...`);

await mintV1(umi, {
  mint: mint.publicKey,
  authority: umi.identity,
  amount,
  tokenOwner: umi.identity.publicKey,
  tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi);

writeFileSync(MINT_FILE, JSON.stringify({ mint: mintAddress, cluster: CFG.cluster }, null, 2));

console.log("✅ Выпуск завершён.");
console.log("   Сохранил адрес в", MINT_FILE);
console.log("   Solscan:", explorerUrl(mintAddress));
console.log("\nСледующие шаги: проверка (npm run verify), затем — отзыв прав (npm run revoke).");
