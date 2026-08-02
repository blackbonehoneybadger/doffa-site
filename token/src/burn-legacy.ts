// npm run token:burn-legacy — сжечь ВСЮ доступную эмиссию СТАРОГО токена DOFFA.
//
// 🔴🔴 САМАЯ ОПАСНАЯ ОПЕРАЦИЯ В РЕПОЗИТОРИИ. НЕОБРАТИМА ПОЛНОСТЬЮ.
//
// Уничтожает 99 000 000 старых DOFFA с кошелька владельца. Восстановить их
// невозможно: у старого токена mint authority уже отозван, значит выпустить
// взамен не сможет никто и никогда.
//
// Зачем это нужно. После миграции в сети остаются два токена с именем DOFFA.
// Пока старые 99 млн лежат у владельца, к проекту справедлив вопрос: «а не
// сольёте ли вы их на рынок?». Сжигание снимает вопрос фактом, проверяемым
// в сети: сливать станет нечего.
//
// Чёрную дыру Hk6X6qb… (1 000 000) скрипт НЕ трогает — оттуда нельзя ни
// забрать, ни сжечь: ключа не существует ни у кого.
//
// ⚠️ Запускается ТОЛЬКО владельцем, локально, со своим ключом. Ни в CI, ни в
//    удалённом контейнере, ни через чужую машину.

import { burn, getMint } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createInterface } from "node:readline/promises";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { join, dirname } from "node:path";
import "dotenv/config";

/** Параметры СТАРОГО токена. Захардкожены намеренно: подставить сюда новый
 *  mint через env означало бы сжечь новую эмиссию вместо старой. */
const LEGACY_MINT = "57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo";
const LEGACY_OWNER = "6cAtKTM8ZPUgRgmzsgkRfZsq4jZTXymA7cLqjz9qYMFS";
const LEGACY_DECIMALS = 6;
const CONFIRM_PHRASE = "BURN ALL LEGACY DOFFA";

const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

function fmt(base: bigint, decimals = LEGACY_DECIMALS): string {
  const f = 10n ** BigInt(decimals);
  const whole = (base / f).toLocaleString("ru-RU");
  const frac = base % f;
  return frac === 0n ? whole : `${whole},${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

async function main(): Promise<void> {
  const keypairPath = (process.env.DOFFA_LEGACY_KEYPAIR_PATH ?? "./legacy-owner.json").trim();
  const rpc = (process.env.DOFFA_RPC_URL ?? "").trim() || clusterApiUrl("mainnet-beta");
  const conn = new Connection(rpc, "confirmed");

  // 1. Сеть обязана быть mainnet — старый токен существует только там.
  const genesis = await conn.getGenesisHash();
  if (genesis !== MAINNET_GENESIS) {
    throw new Error(
      `⛔ Это не mainnet (genesis ${genesis}).\n` +
        "   Старый токен живёт только в mainnet. Операция остановлена.",
    );
  }

  // 2. Ключ владельца — только из локального файла. Приватная часть не печатается.
  if (!existsSync(keypairPath)) {
    throw new Error(
      `⛔ Файл ключа не найден: ${keypairPath}\n\n` +
        "   Нужен ключ от СТАРОГО кошелька " + LEGACY_OWNER + ".\n" +
        "   Укажи путь в DOFFA_LEGACY_KEYPAIR_PATH. Ключ остаётся только у тебя.",
    );
  }
  const raw = JSON.parse(readFileSync(keypairPath, "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`⛔ ${keypairPath} не похож на ключ Solana (нужен массив из 64 чисел).`);
  }
  const signer = Keypair.fromSecretKey(Uint8Array.from(raw as number[]));

  // 3. Подписант обязан быть владельцем старых токенов.
  if (signer.publicKey.toBase58() !== LEGACY_OWNER) {
    throw new Error(
      `⛔ ПОДПИСАНТ НЕ ТОТ.\n` +
        `   Ключ от:  ${signer.publicKey.toBase58()}\n` +
        `   Ожидался: ${LEGACY_OWNER}\n\n` +
        "   Сжигать чужие токены этот скрипт не станет.",
    );
  }

  // 4. Проверяем сам mint и фактический баланс.
  const mint = new PublicKey(LEGACY_MINT);
  const m = await getMint(conn, mint);
  if (m.decimals !== LEGACY_DECIMALS) {
    throw new Error(`⛔ decimals старого токена ${m.decimals}, ожидалось ${LEGACY_DECIMALS}.`);
  }

  const ata = getAssociatedTokenAddressSync(mint, signer.publicKey);
  const balBefore = BigInt((await conn.getTokenAccountBalance(ata)).value.amount);
  if (balBefore === 0n) {
    console.log("\nℹ️  На кошельке нет старых DOFFA — сжигать нечего.\n");
    return;
  }

  const bar = "═".repeat(68);
  console.log(`\n${bar}`);
  console.log("  🔴 СЖИГАНИЕ ВСЕЙ ДОСТУПНОЙ ЭМИССИИ СТАРОГО ТОКЕНА — НЕОБРАТИМО");
  console.log(bar);
  console.log(`  Сеть              mainnet-beta (БОЕВАЯ)`);
  console.log(`  RPC               ${rpc}`);
  console.log(`  Старый mint       ${LEGACY_MINT}`);
  console.log(`  Владелец          ${signer.publicKey.toBase58()}`);
  console.log(`  Токен-аккаунт     ${ata.toBase58()}`);
  console.log(`  Будет сожжено     ${fmt(balBefore)} DOFFA`);
  console.log(`  supply сейчас     ${fmt(m.supply)}`);
  console.log(`  supply станет     ${fmt(m.supply - balBefore)}`);
  console.log(`${bar}\n`);
  console.log("После этой операции:");
  console.log("  • эти токены перестанут существовать НАВСЕГДА;");
  console.log("  • выпустить взамен нельзя — mint authority старого токена отозван;");
  console.log("  • отменяющей операции не существует;");
  console.log("  • в сети останется только то, что лежит в чёрной дыре Hk6X6qb…\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Введи точно «${CONFIRM_PHRASE}» для продолжения:\n> `);
  rl.close();
  if (answer.trim() !== CONFIRM_PHRASE) {
    console.log("\nПодтверждение не совпало. Ничего не сожжено.\n");
    process.exit(1);
  }

  console.log("\nСжигаю…");
  const sig = await burn(conn, signer, ata, mint, signer, balBefore);

  // 5. Перечитываем из сети — верим только ей.
  const after = await getMint(conn, mint);
  const balAfter = BigInt((await conn.getTokenAccountBalance(ata)).value.amount);
  const problems: string[] = [];
  if (after.supply !== m.supply - balBefore) {
    problems.push(`supply ${after.supply}, ожидалось ${m.supply - balBefore}`);
  }
  if (balAfter !== 0n) problems.push(`баланс ${balAfter}, ожидался 0`);
  if (problems.length) {
    throw new Error(
      `⛔ Результат не сошёлся:\n   ${problems.join("\n   ")}\n\n` +
        `   https://solscan.io/tx/${sig}`,
    );
  }

  // 6. Сохраняем подпись — это доказательство для страницы legacy.
  const outDir = join(dirname(new URL(import.meta.url).pathname), "..", "deploy-output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "legacy-burn.json"),
    JSON.stringify(
      {
        mint: LEGACY_MINT,
        owner: LEGACY_OWNER,
        burnedBaseUnits: balBefore.toString(),
        supplyBefore: m.supply.toString(),
        supplyAfter: after.supply.toString(),
        signature: sig,
      },
      null,
      2,
    ) + "\n",
  );

  console.log("\n✅ Старая эмиссия сожжена и сверена с сетью.\n");
  console.log(`   Сожжено      : ${fmt(balBefore)} DOFFA`);
  console.log(`   supply было  : ${fmt(m.supply)}`);
  console.log(`   supply стало : ${fmt(after.supply)}`);
  console.log(`   баланс стал  : ${fmt(balAfter)}`);
  console.log(`\n   Подпись: ${sig}`);
  console.log(`   https://solscan.io/tx/${sig}`);
  console.log(`\n   Записано в token/deploy-output/legacy-burn.json`);
}

main().catch((e: unknown) => {
  console.error(`\n${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
