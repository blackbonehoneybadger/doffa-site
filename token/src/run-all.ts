// npm run token:go — весь выпуск токена одной командой.
//
// 🔒 ЗАПУСКАТЬ ТОЛЬКО НА СВОЁМ КОМПЬЮТЕРЕ. Скрипт подписывает транзакции
//    приватным ключом, а ключу от 100 000 000 токенов место только у тебя.
//    Ни в CI, ни в облачной сессии, ни на чужой машине.
//
// Что делает: по порядку запускает те же самые шаги, что и в runbook, и
// останавливается на первой же ошибке. Каждый шаг — отдельный процесс со
// своими проверками; здесь нет ни одной операции с блокчейном, только
// последовательность и предполётный контроль.
//
// Чего НЕ делает:
//   • не отзывает mint/freeze authority — это отдельная команда token:revoke
//     с отдельной подтверждающей фразой, и только после сверки выпуска;
//   • не сжигает ничего;
//   • не трогает старый токен.
//
// Повторный запуск безопасен: шаги, уже отражённые в deploy-output, пропускаются.
// Поэтому обрыв на середине лечится простым перезапуском.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  CFG,
  IS_MAINNET,
  TARGET,
  assertCluster,
  assertSignerIsOwner,
  assertSolBalance,
  assertTokenParams,
  confirmExactPhrase,
  connection,
  explorerToken,
  explorerTx,
  fail,
  loadKeypair,
  ownerWallet,
  readDeploy,
  rpcEndpoint,
} from "./config.js";

/** Фраза-подтверждение для mainnet. Совпадение должно быть точным. */
const MAINNET_PHRASE = "CREATE MAINNET DOFFA";

/** Временные хостинги — те же, что отвергает token:metadata. */
const TEMPORARY = /vercel\.app|netlify\.app|ngrok|localhost|127\.0\.0\.1|herokuapp/i;

const TOKEN_ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

type Step = {
  /** Имя файла в src/. */
  file: string;
  /** Что этот шаг делает — печатается в плане. */
  title: string;
  /** Уже сделано? Тогда шаг пропускается. */
  done: () => boolean;
  /** Непройденный, но неприменимый шаг: причина пропуска или null. */
  skip?: () => string | null;
};

function steps(): Step[] {
  const d = () => readDeploy();
  return [
    {
      file: "check-wallet.ts",
      title: "предполётная проверка кошелька (ничего не меняет)",
      done: () => false, // проверка бесплатна и всегда полезна — не пропускаем
    },
    {
      file: "create-mint.ts",
      title: `создать mint ${TARGET.name} (${TARGET.symbol}), decimals ${TARGET.decimals}, supply 0`,
      done: () => Boolean(d()?.mint),
    },
    {
      file: "create-owner-token-account.ts",
      title: "токен-аккаунт владельца (ATA)",
      done: () => Boolean(d()?.ownerTokenAccount),
    },
    {
      file: "create-metadata.ts",
      title: "имя, символ и логотип (Metaplex)",
      done: () => Boolean(d()?.metadataUri),
      // На devnet метаданные не обязательны: репетиция проверяет механику
      // выпуска, а постоянный URI к этому моменту может быть ещё не готов.
      // В mainnet этот пропуск невозможен — preflight требует URI заранее.
      skip: () =>
        !IS_MAINNET && !CFG.metadataUri
          ? "DOFFA_METADATA_URI не задан — на devnet это допустимо"
          : null,
    },
    {
      file: "mint-supply.ts",
      title: `выпустить ${TARGET.supply.toLocaleString("ru-RU")} ${TARGET.symbol} на кошелёк владельца`,
      done: () => Boolean(d()?.signatures?.mintSupply),
    },
    {
      file: "verify-token.ts",
      title: "сверить всё с сетью",
      done: () => false, // сверка — смысл всего прогона, выполняется всегда
    },
  ];
}

/** Запускает шаг отдельным процессом. Возвращает код выхода. */
function runStep(file: string): number {
  const require = createRequire(import.meta.url);
  const tsxCli = require.resolve("tsx/cli");
  const r = spawnSync(process.execPath, [tsxCli, join("src", file)], {
    cwd: TOKEN_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) throw r.error;
  // Прерывание по сигналу (Ctrl+C) — это не «шаг не удался», а остановка всего.
  if (r.signal) throw new Error(`Шаг ${file} прерван сигналом ${r.signal}. Дальше не идём.`);
  return r.status ?? 1;
}

/**
 * Проверки, которые обязаны пройти ДО первой транзакции.
 *
 * Смысл в том, чтобы отказ случился на бесплатной стадии. Половина выпуска,
 * упавшая на шаге метаданных, — это уже созданный в сети mint, который нельзя
 * удалить, и потраченный SOL.
 */
async function preflight(planOnly: boolean): Promise<void> {
  assertTokenParams();

  const conn = connection();
  await assertCluster(conn);

  const signer = loadKeypair();
  const owner = ownerWallet();
  assertSignerIsOwner(signer.publicKey);
  // В режиме --plan баланс не проверяем: показать план должно быть можно и
  // на пустом кошельке — это ровно тот момент, когда хочется узнать, сколько
  // SOL понадобится, ещё до пополнения.
  if (!planOnly) await assertSolBalance(conn, signer.publicKey);

  if (!IS_MAINNET) return;

  // Дальше — только для mainnet. Каждая проверка закрывает свой способ
  // потерять деньги необратимо.

  // 1. Репетиция на devnet должна была состояться. Файл devnet.json —
  //    единственное машинно-проверяемое доказательство, что скрипты
  //    прогонялись целиком хотя бы раз.
  const devnetFile = join(TOKEN_ROOT, "deploy-output", "devnet.json");
  if (!existsSync(devnetFile)) {
    throw new Error(
      "⛔ Нет следов devnet-прогона (token/deploy-output/devnet.json).\n\n" +
        "   Сначала выполняется полный цикл на devnet — там всё бесплатно\n" +
        "   и обратимо. Порядок описан в docs/MAINNET-RUNBOOK.md, часть 1.",
    );
  }
  const devnet = JSON.parse(readFileSync(devnetFile, "utf8")) as {
    mint?: string;
    signatures?: Record<string, string>;
  };
  if (!devnet.mint || !devnet.signatures?.mintSupply) {
    throw new Error(
      "⛔ devnet-прогон не доведён до конца.\n\n" +
        `   mint: ${devnet.mint || "нет"}\n` +
        `   эмиссия: ${devnet.signatures?.mintSupply ? "выпущена" : "не выпускалась"}\n\n` +
        "   Репетиция имеет смысл, только если пройдена целиком.",
    );
  }

  // 2. Метаданные. URI пишется в блокчейн один раз: после отзыва authority
  //    его не переписать, и мёртвая ссылка означает токен без имени навсегда.
  if (!CFG.metadataUri) {
    throw new Error(
      "⛔ DOFFA_METADATA_URI пуст.\n\n" +
        "   Логотип и JSON должны лежать в постоянном хранилище (IPFS/Arweave)\n" +
        "   ДО выпуска. Заготовки: token/metadata/, инструкция — часть 2 runbook.",
    );
  }
  if (TEMPORARY.test(CFG.metadataUri)) {
    throw new Error(
      `⛔ URI метаданных выглядит временным: ${CFG.metadataUri}\n\n` +
        "   Нужен IPFS или Arweave. Хостинг, который может исчезнуть, оставит\n" +
        "   токен без имени и логотипа — навсегда и без возможности исправить.",
    );
  }

  // 3. Второй токен с тем же именем — типовой способ обесценить первый.
  if (readDeploy()?.mint) {
    throw new Error(
      `⛔ Для mainnet mint уже создан: ${readDeploy()!.mint}\n\n` +
        "   Повторный полный прогон создал бы ВТОРОЙ независимый токен.\n" +
        "   Если нужно продолжить незавершённый выпуск — так и будет:\n" +
        "   пройденные шаги пропускаются. Это сообщение появляется только\n" +
        "   тогда, когда выпуск уже завершён полностью.",
    );
  }
  void owner;
}

function printPlan(list: Step[]): void {
  const bar = "═".repeat(70);
  console.log(`\n${bar}`);
  console.log(`  ВЫПУСК ТОКЕНА ${TARGET.name} — план`);
  console.log(bar);
  console.log(`  Сеть              ${IS_MAINNET ? "🔴 mainnet-beta — БОЕВАЯ, необратимо" : "🟢 devnet — тестовая"}`);
  console.log(`  RPC               ${rpcEndpoint()}`);
  console.log(`  Владелец          ${CFG.ownerWallet}`);
  console.log(`  Эмиссия           ${TARGET.supply.toLocaleString("ru-RU")} ${TARGET.symbol}, decimals ${TARGET.decimals}`);
  console.log(`  Метаданные        ${CFG.metadataUri || "(не заданы)"}`);
  console.log(bar);
  list.forEach((s, i) => {
    const reason = s.skip?.() ?? null;
    const mark = s.done() ? "✓ уже сделано" : reason ? "— пропуск" : "→";
    console.log(`  ${i + 1}. ${mark.padEnd(14)} ${s.title}`);
    if (!s.done() && reason) console.log(`     ${" ".repeat(14)} ${reason}`);
  });
  console.log(bar);
  console.log("  НЕ входит в прогон: отзыв authority, сжигание, старый токен.\n");
}

async function confirmMainnet(): Promise<void> {
  console.log("🔴 Это mainnet. Дальше — реальные деньги и необратимые операции.\n");
  console.log("   После выпуска: mint останется в сети навсегда, потраченный SOL не вернуть.");
  console.log("   Перед вводом фразы убедись, что резервная копия ключа проверена");
  console.log("   восстановлением. Первый миллион DOFFA потерян именно из-за этого.\n");
  await confirmExactPhrase(MAINNET_PHRASE);
}

function printSummary(): void {
  const d = readDeploy();
  if (!d?.mint) return;
  const bar = "═".repeat(70);
  console.log(`\n${bar}`);
  console.log("  ГОТОВО. Это нужно сохранить и прислать для сверки:");
  console.log(bar);
  console.log(`  Сеть              ${d.cluster}`);
  console.log(`  Mint address      ${d.mint}`);
  console.log(`  Токен-аккаунт     ${d.ownerTokenAccount ?? "—"}`);
  console.log(`  Владелец          ${d.ownerWallet}`);
  console.log(`  decimals / supply ${d.decimals} / ${d.supply}`);
  console.log(`  Метаданные        ${d.metadataUri ?? "—"}`);
  console.log("  Подписи:");
  for (const [k, sig] of Object.entries(d.signatures ?? {})) {
    console.log(`    ${k.padEnd(16)} ${sig}`);
    console.log(`    ${" ".repeat(16)} ${explorerTx(sig)}`);
  }
  console.log(`\n  ${explorerToken(d.mint)}`);
  console.log(`\n  Файл: token/deploy-output/${d.cluster}.json`);
  console.log(bar);

  if (IS_MAINNET) {
    console.log("\n🔴 Полномочия НЕ отозваны — и это правильно.");
    console.log("   Пока mint authority у тебя, выпуск ещё можно исправить.");
    console.log("   Сначала сверка, сайт и отчёт. Только потом: npm run token:revoke\n");
  } else {
    console.log("\nДальше по runbook: проверки защит (часть 1.3), затем сжигание");
    console.log("и отзыв на devnet (часть 1.4) — и только после этого mainnet.\n");
  }
}

async function main(): Promise<void> {
  const planOnly = process.argv.includes("--plan");

  await preflight(planOnly);

  const list = steps();
  printPlan(list);

  if (planOnly) {
    console.log("Режим --plan: ничего не выполнено.\n");
    return;
  }

  if (IS_MAINNET) await confirmMainnet();

  for (const [i, s] of list.entries()) {
    if (s.done()) {
      console.log(`\n[${i + 1}/${list.length}] ✓ пропуск — уже сделано: ${s.title}`);
      continue;
    }
    const reason = s.skip?.() ?? null;
    if (reason) {
      console.log(`\n[${i + 1}/${list.length}] — пропуск: ${s.title}\n     ${reason}`);
      continue;
    }
    console.log(`\n[${i + 1}/${list.length}] ${s.file} — ${s.title}`);
    const code = runStep(s.file);
    if (code !== 0) {
      throw new Error(
        `⛔ Шаг ${s.file} завершился с ошибкой (код ${code}). Причина — в его выводе выше.\n\n` +
          "   Дальнейшие шаги не выполнялись. Исправь причину и запусти\n" +
          "   npm run token:go снова: пройденные шаги пропустятся.",
      );
    }
  }

  printSummary();
}

main().catch(fail);
