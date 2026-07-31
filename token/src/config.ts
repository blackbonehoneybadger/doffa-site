// Общая конфигурация и предполётные проверки для всех скриптов нового токена.
//
// 🔒 БЕЗОПАСНОСТЬ. Приватный ключ читается из локального файла по пути из
//    DOFFA_KEYPAIR_PATH и НИКОГДА не печатается, не логируется и не
//    отправляется. Наружу выходит только публичный адрес.
//
// Принцип: любая операция сначала печатает, что именно она сделает и в какой
// сети, и только потом подписывает. Расхождение фактического состояния сети с
// ожидаемым — всегда фатальная ошибка, а не предупреждение.

import "dotenv/config";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  Keypair,
  Connection,
  clusterApiUrl,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity, type Umi } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

export type Cluster = "devnet" | "mainnet-beta";

/** Целевые параметры токена. Захардкожены намеренно — см. assertTokenParams. */
export const TARGET = {
  name: "DOFFA",
  symbol: "DOFFA",
  decimals: 6,
  /** Эмиссия в целых токенах. */
  supply: 100_000_000n,
} as const;

function envStr(v: string | undefined): string {
  return (v ?? "").trim();
}

function parseCluster(v: string): Cluster {
  if (v === "devnet" || v === "mainnet-beta") return v;
  throw new Error(
    `DOFFA_CLUSTER должен быть devnet или mainnet-beta, а не «${v}».\n` +
      "Пустое или произвольное значение недопустимо: скрипт не должен гадать, в какой он сети.",
  );
}

export const CFG = {
  cluster: parseCluster(envStr(process.env.DOFFA_CLUSTER) || "devnet"),
  rpcUrl: envStr(process.env.DOFFA_RPC_URL),
  keypairPath: envStr(process.env.DOFFA_KEYPAIR_PATH) || "./owner.json",
  name: envStr(process.env.DOFFA_NAME) || TARGET.name,
  symbol: envStr(process.env.DOFFA_SYMBOL) || TARGET.symbol,
  decimals: Number(envStr(process.env.DOFFA_DECIMALS) || String(TARGET.decimals)),
  supply: BigInt(envStr(process.env.DOFFA_SUPPLY) || TARGET.supply.toString()),
  ownerWallet: envStr(process.env.DOFFA_OWNER_WALLET),
  metadataUri: envStr(process.env.DOFFA_METADATA_URI),
  mintAddress: envStr(process.env.DOFFA_MINT_ADDRESS),
};

export const IS_MAINNET = CFG.cluster === "mainnet-beta";

/* ─────────────────────────── единицы измерения ─────────────────────────── */

/**
 * Множитель базовых единиц: 10^decimals.
 *
 * Всё считается в BigInt. Числа с плавающей точкой здесь запрещены: 100 млн
 * токенов с 6 знаками — это 10^14 базовых единиц, что уже за пределами
 * безопасной целочисленной точности double, и округление тихо исказило бы
 * эмиссию.
 */
export function baseUnitFactor(decimals: number = CFG.decimals): bigint {
  return 10n ** BigInt(decimals);
}

/** Целые токены → базовые единицы. */
export function toBaseUnits(tokens: bigint, decimals: number = CFG.decimals): bigint {
  return tokens * baseUnitFactor(decimals);
}

/** Базовые единицы → строка с десятичной точкой, без потери точности. */
export function formatBaseUnits(base: bigint, decimals: number = CFG.decimals): string {
  const f = baseUnitFactor(decimals);
  const whole = base / f;
  const frac = base % f;
  const wholeStr = whole.toLocaleString("ru-RU");
  if (frac === 0n) return wholeStr;
  return `${wholeStr},${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

/** Разбирает пользовательский ввод «1234.56» в базовые единицы. Без float. */
export function parseTokenAmount(input: string, decimals: number = CFG.decimals): bigint {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Некорректное количество: «${input}». Ожидается число, например 1000 или 12.5`);
  }
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals) {
    throw new Error(
      `Слишком много знаков после точки: ${frac.length}, а у токена их ${decimals}.\n` +
        "Обрезать молча нельзя — это исказило бы сумму. Укажи корректное значение.",
    );
  }
  return BigInt(whole) * baseUnitFactor(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

/* ──────────────────────────── сеть и подписант ─────────────────────────── */

export function rpcEndpoint(): string {
  return CFG.rpcUrl || clusterApiUrl(CFG.cluster);
}

export function connection(): Connection {
  return new Connection(rpcEndpoint(), "confirmed");
}

/**
 * Проверяет, что RPC действительно отвечает из той сети, которая заявлена в
 * конфиге. Без этого опечатка в RPC_URL могла бы отправить «devnet-тест»
 * в mainnet — с необратимыми последствиями.
 *
 * Различаем сети по genesis hash — он у каждой свой и подделать его нельзя.
 */
const GENESIS: Record<Cluster, string> = {
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
};

export async function assertCluster(conn: Connection): Promise<void> {
  const hash = await conn.getGenesisHash();
  const expected = GENESIS[CFG.cluster];
  if (hash !== expected) {
    const actual = (Object.entries(GENESIS).find(([, h]) => h === hash) ?? ["неизвестная сеть"])[0];
    throw new Error(
      `⛔ СЕТЬ НЕ СОВПАДАЕТ.\n` +
        `   В конфиге:  ${CFG.cluster}\n` +
        `   Фактически: ${actual} (genesis ${hash})\n` +
        `   RPC:        ${rpcEndpoint()}\n\n` +
        `   Операция остановлена. Проверь DOFFA_CLUSTER и DOFFA_RPC_URL.`,
    );
  }
}

/** Загружает ключ подписанта. Приватная часть наружу не выходит. */
export function loadSecretKey(): Uint8Array {
  if (!existsSync(CFG.keypairPath)) {
    throw new Error(
      `Файл ключа не найден: ${CFG.keypairPath}\n` +
        "Укажи путь в DOFFA_KEYPAIR_PATH. Ключ создаётся и хранится только локально.",
    );
  }
  const raw = JSON.parse(readFileSync(CFG.keypairPath, "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`Файл ${CFG.keypairPath} не похож на ключ Solana (нужен JSON-массив из 64 чисел).`);
  }
  return Uint8Array.from(raw as number[]);
}

export function loadKeypair(): Keypair {
  return Keypair.fromSecretKey(loadSecretKey());
}

export function ownerWallet(): PublicKey {
  if (!CFG.ownerWallet) {
    throw new Error("DOFFA_OWNER_WALLET не задан. Укажи адрес кошелька владельца в .env");
  }
  return new PublicKey(CFG.ownerWallet);
}

/**
 * На mainnet подписант обязан быть владельцем: вся эмиссия уходит на
 * DOFFA_OWNER_WALLET, и если подписывает другой ключ, значит конфигурация
 * перепутана — а цена такой путаницы в mainnet необратима.
 *
 * На devnet подписант может быть любым: ключа от боевого кошелька у тестового
 * прогона нет и быть не должно. Токены при этом всё равно минтятся на реальный
 * адрес владельца — так тестируется ровно тот путь, что пойдёт в mainnet.
 */
export function assertSignerIsOwner(signer: PublicKey): void {
  const owner = ownerWallet();
  if (signer.equals(owner)) return;
  if (IS_MAINNET) {
    throw new Error(
      `⛔ ПОДПИСАНТ НЕ ВЛАДЕЛЕЦ.\n` +
        `   Подписывает: ${signer.toBase58()}\n` +
        `   Владелец:    ${owner.toBase58()}\n\n` +
        `   В mainnet это запрещено: эмиссия ушла бы на кошелёк, ключ от которого\n` +
        `   может быть не тем, что ты думаешь. Именно так теряются токены.`,
    );
  }
  console.log(
    `ℹ️  devnet: подписывает тестовый ключ ${signer.toBase58()},\n` +
      `   а эмиссия уйдёт на боевой адрес владельца ${owner.toBase58()}.\n` +
      `   Это нормально — проверяется тот же путь, что пойдёт в mainnet.\n`,
  );
}

/** Проверяет, что параметры в .env не разошлись с целевыми. */
export function assertTokenParams(): void {
  const errs: string[] = [];
  if (CFG.name !== TARGET.name) errs.push(`name: ${CFG.name} ≠ ${TARGET.name}`);
  if (CFG.symbol !== TARGET.symbol) errs.push(`symbol: ${CFG.symbol} ≠ ${TARGET.symbol}`);
  if (CFG.decimals !== TARGET.decimals) errs.push(`decimals: ${CFG.decimals} ≠ ${TARGET.decimals}`);
  if (CFG.supply !== TARGET.supply) errs.push(`supply: ${CFG.supply} ≠ ${TARGET.supply}`);
  if (errs.length) {
    throw new Error(
      `⛔ Параметры токена в .env разошлись с целевыми:\n   ${errs.join("\n   ")}\n\n` +
        "   Эти значения определяют экономику токена и меняться не должны.",
    );
  }
}

/** Проверяет баланс SOL подписанта. */
export async function assertSolBalance(conn: Connection, signer: PublicKey, needSol = 0.05): Promise<number> {
  const lamports = await conn.getBalance(signer);
  const sol = lamports / LAMPORTS_PER_SOL;
  if (lamports === 0) {
    throw new Error(
      `⛔ На ${signer.toBase58()} нет SOL. Комиссию платить нечем.\n` +
        (IS_MAINNET ? "   Пополни кошелёк." : "   Выполни: npm run token:airdrop"),
    );
  }
  if (sol < needSol) {
    console.log(`⚠️  Баланс низкий: ${sol.toFixed(4)} SOL (желательно ≥ ${needSol}).`);
  }
  return sol;
}

export function makeUmi(): Umi {
  const umi = createUmi(rpcEndpoint());
  umi.use(mplToolbox());
  umi.use(mplTokenMetadata());
  const kp = umi.eddsa.createKeypairFromSecretKey(loadSecretKey());
  umi.use(signerIdentity(createSignerFromKeypair(umi, kp)));
  return umi;
}

/* ──────────────────────── deployment output ────────────────────────────── */

/**
 * Результат выпуска пишется в файл, отдельный для каждой сети, — чтобы
 * devnet-прогон физически не мог подсунуть свой mint в mainnet-операцию.
 * Папка в .gitignore: адрес mint публичный, но файл ещё и служебный.
 */
export const DEPLOY_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "deploy-output");

export type DeployOutput = {
  cluster: Cluster;
  mint: string;
  ownerWallet: string;
  ownerTokenAccount?: string;
  decimals: number;
  supply: string;
  metadataUri?: string;
  signatures: Record<string, string>;
  createdAt: string;
};

export function deployFile(): string {
  return join(DEPLOY_DIR, `${CFG.cluster}.json`);
}

export function readDeploy(): DeployOutput | null {
  const f = deployFile();
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8")) as DeployOutput;
}

export function writeDeploy(patch: Partial<DeployOutput>): DeployOutput {
  mkdirSync(DEPLOY_DIR, { recursive: true });
  const prev = readDeploy();
  const next: DeployOutput = {
    cluster: CFG.cluster,
    mint: "",
    ownerWallet: CFG.ownerWallet,
    decimals: CFG.decimals,
    supply: CFG.supply.toString(),
    createdAt: new Date().toISOString(),
    ...prev,
    ...patch,
    // Подписи не перезаписываются, а накапливаются: каждый шаг добавляет свою,
    // и к концу цикла в файле лежит полная история операций над токеном.
    signatures: { ...(prev?.signatures ?? {}), ...(patch.signatures ?? {}) },
  };
  writeFileSync(deployFile(), JSON.stringify(next, null, 2) + "\n");
  return next;
}

/** Адрес mint: из .env или из deploy-output текущей сети. */
export function resolveMint(): PublicKey {
  if (CFG.mintAddress) return new PublicKey(CFG.mintAddress);
  const d = readDeploy();
  if (d?.mint) return new PublicKey(d.mint);
  throw new Error(
    `Адрес mint неизвестен для сети ${CFG.cluster}.\n` +
      "Укажи DOFFA_MINT_ADDRESS в .env или сначала выполни: npm run token:create",
  );
}

/* ────────────────────────────── вывод ──────────────────────────────────── */

export function explorerToken(address: string): string {
  return `https://solscan.io/token/${address}${IS_MAINNET ? "" : `?cluster=${CFG.cluster}`}`;
}

export function explorerTx(sig: string): string {
  return `https://solscan.io/tx/${sig}${IS_MAINNET ? "" : `?cluster=${CFG.cluster}`}`;
}

export function explorerAccount(address: string): string {
  return `https://solscan.io/account/${address}${IS_MAINNET ? "" : `?cluster=${CFG.cluster}`}`;
}

/** Шапка: что за операция, в какой сети, кто подписывает. Печатается ДО подписи. */
export function printHeader(action: string, extra: Record<string, string> = {}): void {
  const bar = "─".repeat(66);
  console.log(`\n${bar}`);
  console.log(`  ${action}`);
  console.log(bar);
  const rows: Record<string, string> = {
    Сеть: IS_MAINNET ? "🔴 mainnet-beta (БОЕВАЯ, необратимо)" : "🟢 devnet (тестовая)",
    RPC: rpcEndpoint(),
    "Кошелёк владельца": CFG.ownerWallet || "(не задан)",
    ...extra,
  };
  for (const [k, v] of Object.entries(rows)) console.log(`  ${k.padEnd(22)} ${v}`);
  console.log(`${bar}\n`);
}

/** Единая обработка ошибок: печатаем сообщение и выходим с кодом 1. */
export function fail(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`\n${msg}\n`);
  process.exit(1);
}
