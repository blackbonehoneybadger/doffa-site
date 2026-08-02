// Шаг 3. Выпускаем токен $DOFFA: создаём минт + метаданные (имя/символ/лого)
// и минтим весь объём владельцу. Это «фундамент» токена.
import { writeFileSync } from "node:fs";
import {
  createFungible,
  mintV1,
  updateV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount, publicKey, some } from "@metaplex-foundation/umi";
import { CFG, makeUmi, MINT_FILE, explorerUrl } from "./config.js";

if (!CFG.metadataUri) {
  console.error("⛔ METADATA_URI пуст. Укажи в .env ссылку на JSON-метаданные токена (лого/имя).");
  process.exit(1);
}

// На mainnet вся эмиссия должна уходить сразу в treasury-кошелёк, а не оставаться
// у служебного ключа owner.json — иначе им придётся владеть токенами навсегда.
if (CFG.cluster === "mainnet-beta" && !CFG.recipient) {
  console.error("⛔ RECIPIENT_ADDRESS пуст. На mainnet укажи адрес treasury-кошелька в .env.");
  process.exit(1);
}

const umi = makeUmi();
const mint = generateSigner(umi);
const recipient = CFG.recipient ? publicKey(CFG.recipient) : umi.identity.publicKey;

console.log(`Сеть: ${CFG.cluster}`);
console.log(`Создаю токен ${CFG.name} (${CFG.symbol}), decimals=${CFG.decimals} ...`);

// Финализируем создание минта, чтобы все узлы RPC увидели аккаунт (devnet — балансировщик).
// updateAuthority на этом шаге НЕ передаём — по умолчанию она = identity (служебный
// ключ), иначе Metaplex требует подпись recipient для верификации creator (0x36).
// Передаём её в treasury отдельной транзакцией (updateV1) сразу после минтинга.
await createFungible(umi, {
  mint,
  name: CFG.name,
  symbol: CFG.symbol,
  uri: CFG.metadataUri,
  sellerFeeBasisPoints: percentAmount(0),
  decimals: some(CFG.decimals),
}).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });

const mintAddress = mint.publicKey.toString();
console.log("✅ Минт создан:", mintAddress);

// Сохраняем адрес сразу — на случай, если минтинг придётся повторить отдельно.
writeFileSync(MINT_FILE, JSON.stringify({ mint: mintAddress, cluster: CFG.cluster }, null, 2));

// Минтим весь объём в базовых единицах (supply * 10^decimals) в treasury-кошелёк.
const amount = CFG.supply * 10n ** BigInt(CFG.decimals);
console.log(`Минчу ${CFG.supply.toString()} ${CFG.symbol} на адрес ${recipient.toString()} ...`);

await mintV1(umi, {
  mint: mint.publicKey,
  authority: umi.identity,
  amount,
  tokenOwner: recipient,
  tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });

console.log("✅ Выпуск завершён.");

// Передаём право менять метаданные (имя/лого/описание) в treasury — иначе
// служебный ключ owner.json навсегда мог бы редактировать метаданные токена.
if (CFG.recipient) {
  console.log(`Передаю updateAuthority метаданных на ${recipient.toString()} ...`);
  await updateV1(umi, {
    mint: mint.publicKey,
    authority: umi.identity,
    newUpdateAuthority: recipient,
  }).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });
  console.log("✅ updateAuthority передана в treasury.");
}

console.log("   Сохранил адрес в", MINT_FILE);
console.log("   Solscan:", explorerUrl(mintAddress));
console.log("\nСледующие шаги: проверка (npm run verify), затем — отзыв прав (npm run revoke).");
