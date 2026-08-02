// npm run token:verify — полная сверка токена с сетью. Ничего не изменяет.
//
// Это последний рубеж перед необратимым отзывом полномочий. Скрипт не верит
// ни .env, ни deploy-output: всё перечитывается напрямую из Solana RPC и
// сравнивается с целевыми значениями. Любое расхождение — код возврата 1.

import { getMint } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import {
  CFG,
  TARGET,
  assertCluster,
  assertTokenParams,
  connection,
  explorerToken,
  fail,
  formatBaseUnits,
  makeUmi,
  ownerWallet,
  printHeader,
  readDeploy,
  resolveMint,
  toBaseUnits,
} from "./config.js";

type Check = { ok: boolean; label: string; got: string; want: string };

function check(label: string, got: string, want: string): Check {
  return { ok: got === want, label, got, want };
}

async function main(): Promise<void> {
  assertTokenParams();
  const conn = connection();
  await assertCluster(conn);

  const mint = resolveMint();
  const owner = ownerWallet();
  const targetBase = toBaseUnits(TARGET.supply);

  printHeader("СВЕРКА ТОКЕНА С СЕТЬЮ (только чтение)", {
    "Mint": mint.toBase58(),
    "Владелец": owner.toBase58(),
  });

  const m = await getMint(conn, mint);
  const checks: Check[] = [
    check("decimals", String(m.decimals), String(TARGET.decimals)),
    check("supply (базовые единицы)", m.supply.toString(), targetBase.toString()),
  ];

  // Баланс владельца.
  const ata = getAssociatedTokenAddressSync(mint, owner);
  let ownerBase = 0n;
  try {
    const bal = await conn.getTokenAccountBalance(ata);
    ownerBase = BigInt(bal.value.amount);
  } catch {
    checks.push({ ok: false, label: "токен-аккаунт владельца", got: "не найден", want: ata.toBase58() });
  }
  checks.push(check("баланс владельца", ownerBase.toString(), targetBase.toString()));

  // Метаданные.
  let metaName = "—", metaSymbol = "—", metaUri = "—";
  try {
    const meta = await fetchMetadataFromSeeds(makeUmi(), { mint: publicKey(mint.toBase58()) });
    metaName = meta.name.replace(/\0/g, "");
    metaSymbol = meta.symbol.replace(/\0/g, "");
    metaUri = meta.uri.replace(/\0/g, "");
  } catch {
    // Метаданных может ещё не быть — это не ошибка на раннем этапе.
  }
  checks.push(check("metadata name", metaName, TARGET.name));
  checks.push(check("metadata symbol", metaSymbol, TARGET.symbol));

  // Печать.
  let failed = 0;
  console.log("Проверки:\n");
  for (const c of checks) {
    if (!c.ok) failed++;
    const mark = c.ok ? "✅" : "❌";
    console.log(`  ${mark} ${c.label.padEnd(26)} ${c.got}`);
    if (!c.ok) console.log(`     ${" ".repeat(26)} ожидалось: ${c.want}`);
  }

  // Полномочия — отдельно: это не «правильно/неправильно», а состояние.
  const mintAuth = m.mintAuthority?.toBase58() ?? null;
  const freezeAuth = m.freezeAuthority?.toBase58() ?? null;
  console.log("\nПолномочия:\n");
  console.log(`  mint authority   : ${mintAuth ?? "None — отозван навсегда"}`);
  console.log(`  freeze authority : ${freezeAuth ?? "None — отозван навсегда"}`);

  console.log("\nПрочее:\n");
  console.log(`  metadata uri     : ${metaUri}`);
  console.log(`  supply (читаемо) : ${formatBaseUnits(m.supply)} ${TARGET.symbol}`);
  console.log(`  ATA владельца    : ${ata.toBase58()}`);
  const d = readDeploy();
  if (d?.signatures && Object.keys(d.signatures).length) {
    console.log("\nПодписи транзакций:\n");
    for (const [k, v] of Object.entries(d.signatures)) console.log(`  ${k.padEnd(16)} ${v}`);
  }
  console.log(`\n  ${explorerToken(mint.toBase58())}`);

  if (failed > 0) {
    throw new Error(`⛔ Не сошлось проверок: ${failed}. Отзывать полномочия НЕЛЬЗЯ.`);
  }

  console.log("\n✅ Всё сходится с целевыми параметрами.");
  if (mintAuth === null && freezeAuth === null) {
    console.log("   Полномочия уже отозваны — токен окончательно зафиксирован.");
  } else {
    console.log("\n   Полномочия ещё активны. Отзыв — необратимая операция,");
    console.log("   выполняется отдельной командой и только по решению владельца:");
    console.log("   npm run token:revoke");
  }
  void CFG;
}

main().catch(fail);
