// Шаг 5. Отзываем mint authority и freeze authority.
// После этого НИКТО (включая владельца) не сможет допечатать или заморозить токены.
// Это ключевой шаг доверия. Делать ПОСЛЕ того, как весь объём заминчен.
import { setAuthority, AuthorityType, getMint } from "@solana/spl-token";
import { connection, loadKeypair, resolveMint, CFG, explorerUrl } from "./config.js";

const conn = connection();
const owner = loadKeypair();
const mint = resolveMint();

console.log(`Отзываю права у токена ${mint.toBase58()} (сеть ${CFG.cluster}) ...`);

// Отзываем право чеканки (mint authority -> null)
await setAuthority(conn, owner, mint, owner, AuthorityType.MintTokens, null);
console.log("✅ Mint authority отозван.");

// Отзываем право заморозки (freeze authority -> null), если оно ещё есть
const info = await getMint(conn, mint);
if (info.freezeAuthority) {
  await setAuthority(conn, owner, mint, owner, AuthorityType.FreezeAccount, null);
  console.log("✅ Freeze authority отозван.");
} else {
  console.log("ℹ️ Freeze authority уже отсутствует.");
}

console.log("Готово. Solscan:", explorerUrl(mint.toBase58()));
