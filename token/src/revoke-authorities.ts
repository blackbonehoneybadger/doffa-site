// npm run token:revoke — отозвать mint и freeze authority.
//
// 🔴 ОПЕРАЦИЯ НЕОБРАТИМА. После неё:
//    • выпустить новые токены нельзя НИКОГДА и НИКОМУ, включая владельца;
//    • заморозить чужие токен-аккаунты нельзя;
//    • откатить это невозможно — отменяющей операции в протоколе не существует.
//
// Именно поэтому отзыв вынесен в отдельную команду, требует прохождения всех
// проверок и на mainnet — точной подтверждающей фразы.

import { getMint, setAuthority, AuthorityType } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createInterface } from "node:readline/promises";
import {
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
  formatBaseUnits,
  loadKeypair,
  ownerWallet,
  printHeader,
  resolveMint,
  toBaseUnits,
  writeDeploy,
} from "./config.js";

const CONFIRM_PHRASE = "REVOKE DOFFA AUTHORITIES";

async function main(): Promise<void> {
  assertTokenParams();
  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const owner = ownerWallet();
  const mint = resolveMint();
  assertSignerIsOwner(signer.publicKey);

  const m = await getMint(conn, mint);
  const targetBase = toBaseUnits(TARGET.supply);

  // ── Предусловия: отзывать можно только полностью готовый токен ──────────
  const blockers: string[] = [];
  if (m.decimals !== TARGET.decimals) blockers.push(`decimals ${m.decimals} ≠ ${TARGET.decimals}`);
  if (m.supply !== targetBase) {
    blockers.push(`supply ${formatBaseUnits(m.supply)} ≠ ${TARGET.supply.toLocaleString("ru-RU")}`);
  }

  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    const bal = await conn.getTokenAccountBalance(ata);
    if (BigInt(bal.value.amount) !== targetBase) {
      blockers.push(`баланс владельца ${formatBaseUnits(BigInt(bal.value.amount))} ≠ вся эмиссия`);
    }
  } catch {
    blockers.push("токен-аккаунт владельца не найден");
  }

  if (m.mintAuthority === null && m.freezeAuthority === null) {
    console.log("\nℹ️  Полномочия уже отозваны — делать нечего. Токен зафиксирован.\n");
    return;
  }

  if (blockers.length) {
    throw new Error(
      `⛔ Отзыв заблокирован, токен не готов:\n   ${blockers.join("\n   ")}\n\n` +
        "   Отзыв необратим. Пока эмиссия не выпущена и не проверена,\n" +
        "   отзывать mint authority — значит навсегда получить нерабочий токен.",
    );
  }

  printHeader("🔴 ОТЗЫВ ПОЛНОМОЧИЙ — НЕОБРАТИМО", {
    "Подписывает": signer.publicKey.toBase58(),
    "Mint": mint.toBase58(),
    "supply": `${formatBaseUnits(m.supply)} ${TARGET.symbol} (проверено)`,
    "mint authority": m.mintAuthority ? `${m.mintAuthority.toBase58()} → None` : "уже None",
    "freeze authority": m.freezeAuthority ? `${m.freezeAuthority.toBase58()} → None` : "уже None",
  });

  console.log("После этой операции:");
  console.log("  • новые токены выпустить нельзя никогда и никому;");
  console.log("  • заморозить чужие аккаунты нельзя;");
  console.log("  • отменяющей операции не существует.\n");

  // На mainnet — точная фраза. На devnet тренируемся без неё.
  if (IS_MAINNET) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Введи точно «${CONFIRM_PHRASE}» для продолжения:\n> `);
    rl.close();
    if (answer.trim() !== CONFIRM_PHRASE) {
      throw new Error("Подтверждение не совпало. Ничего не изменено.");
    }
    console.log("");
  } else {
    console.log("🟢 devnet: подтверждающая фраза не запрашивается (тренировка).\n");
  }

  await assertSolBalance(conn, signer.publicKey, 0.002);

  const sigs: Record<string, string> = {};
  if (m.mintAuthority) {
    console.log("Отзываю mint authority…");
    sigs.revokeMint = await setAuthority(conn, signer, mint, signer, AuthorityType.MintTokens, null);
  }
  if (m.freezeAuthority) {
    console.log("Отзываю freeze authority…");
    sigs.revokeFreeze = await setAuthority(conn, signer, mint, signer, AuthorityType.FreezeAccount, null);
  }

  // Перечитываем из сети — верим только ей.
  const after = await getMint(conn, mint);
  if (after.mintAuthority !== null || after.freezeAuthority !== null) {
    throw new Error(
      `⛔ Полномочия отозваны не полностью:\n` +
        `   mintAuthority:   ${after.mintAuthority?.toBase58() ?? "None"}\n` +
        `   freezeAuthority: ${after.freezeAuthority?.toBase58() ?? "None"}`,
    );
  }
  if (after.supply !== targetBase) {
    throw new Error(`⛔ supply изменился во время отзыва: ${after.supply} ≠ ${targetBase}`);
  }

  writeDeploy({ signatures: sigs });

  console.log("\n✅ Полномочия отозваны и проверены в сети.\n");
  console.log(`   mintAuthority   : None`);
  console.log(`   freezeAuthority : None`);
  console.log(`   supply          : ${formatBaseUnits(after.supply)} ${TARGET.symbol} — зафиксирован навсегда`);
  for (const [k, v] of Object.entries(sigs)) console.log(`\n   ${k}: ${explorerTx(v)}`);
  console.log(`\n   ${explorerToken(mint.toBase58())}`);
}

main().catch(fail);
