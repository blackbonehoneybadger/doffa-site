// Шаг 4. Сжигаем токены (за проданные чашки). Кол-во — аргумент команды.
// Пример: npm run burn -- 15   (сожжёт 15 $DOFFA)
import { burnV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { CFG, makeUmi, resolveMint, explorerUrl } from "./config.js";

const arg = process.argv[2];
const human = arg ? Number(arg) : NaN;
if (!Number.isFinite(human) || human <= 0) {
  console.error("⛔ Укажи количество. Пример: npm run burn -- 15");
  process.exit(1);
}

const umi = makeUmi();
const mint = publicKey(resolveMint().toBase58());
const amount = BigInt(Math.round(human)) * 10n ** BigInt(CFG.decimals);

console.log(`Сжигаю ${human} ${CFG.symbol} (сеть ${CFG.cluster}) ...`);

await burnV1(umi, {
  mint,
  authority: umi.identity,
  tokenOwner: umi.identity.publicKey,
  amount,
  tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi);

console.log("🔥 Готово. Сожжено", human, CFG.symbol);
console.log("   Solscan:", explorerUrl(resolveMint().toBase58()));
