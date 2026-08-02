// Шаг 6. Проверка состояния токена: объём, decimals, кто имеет права.
import { getMint } from "@solana/spl-token";
import { connection, resolveMint, CFG, explorerUrl } from "./config.js";

const conn = connection();
const mint = resolveMint();
const info = await getMint(conn, mint);

const supplyHuman = Number(info.supply) / 10 ** info.decimals;

console.log("=== Токен", CFG.symbol, "===");
console.log("Сеть:           ", CFG.cluster);
console.log("Минт:           ", mint.toBase58());
console.log("Decimals:       ", info.decimals);
console.log("Объём в обороте:", supplyHuman.toLocaleString("ru-RU"), CFG.symbol);
console.log("Mint authority: ", info.mintAuthority ? info.mintAuthority.toBase58() : "ОТОЗВАН ✅");
console.log("Freeze authority:", info.freezeAuthority ? info.freezeAuthority.toBase58() : "ОТОЗВАН ✅");
console.log("Solscan:        ", explorerUrl(mint.toBase58()));
