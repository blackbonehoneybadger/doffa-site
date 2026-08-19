import "dotenv/config";
import { readFileSync, existsSync, lstatSync } from "node:fs";
import { Keypair, Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  type Umi,
} from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import type { TokenCluster } from "./safety.js";

export type Cluster = TokenCluster;

function clusterFromEnv(value: string | undefined): Cluster {
  const cluster = (value ?? "devnet").trim();
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    throw new Error("CLUSTER должен быть devnet или mainnet-beta");
  }
  return cluster;
}

function integerFromEnv(
  value: string | undefined,
  fallback: string,
  name: string,
  max: number,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > max) {
    throw new Error(`${name} должен быть целым числом от 0 до ${max}`);
  }
  return parsed;
}

function supplyFromEnv(value: string | undefined): bigint {
  const raw = (value ?? "100000000").trim();
  if (!/^[1-9]\d{0,29}$/.test(raw)) {
    throw new Error("TOKEN_SUPPLY должен быть положительным целым числом до 30 цифр");
  }
  return BigInt(raw);
}

export const CFG = {
  cluster: clusterFromEnv(process.env.CLUSTER),
  rpcUrl: process.env.RPC_URL?.trim() || "",
  keypairPath: process.env.KEYPAIR_PATH ?? "./owner.json",
  name: process.env.TOKEN_NAME ?? "DOFFA",
  symbol: process.env.TOKEN_SYMBOL ?? "DOFFA",
  decimals: integerFromEnv(process.env.TOKEN_DECIMALS, "6", "TOKEN_DECIMALS", 18),
  supply: supplyFromEnv(process.env.TOKEN_SUPPLY),
  metadataUri: process.env.METADATA_URI ?? "",
  mintAddress: process.env.MINT_ADDRESS?.trim() || "",
  // Кому уходит вся эмиссия при создании. Если пусто — минтится владельцу ключа
  // (owner.json), что оставляет служебный ключ держателем токенов — небезопасно
  // для mainnet. На mainnet всегда указывай реальный кошелёк-treasury.
  recipient: process.env.RECIPIENT_ADDRESS?.trim() || "",
};

export const MINT_FILE = ".doffa-mint.json";

export function rpcEndpoint(): string {
  if (CFG.rpcUrl) {
    const url = new URL(CFG.rpcUrl);
    if (url.username || url.password) throw new Error("RPC_URL не должен содержать credentials в URL");
    if (CFG.cluster === "mainnet-beta" && url.protocol !== "https:") {
      throw new Error("На mainnet RPC_URL обязан использовать HTTPS");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("RPC_URL должен использовать HTTP или HTTPS");
    }
    return url.toString();
  }
  return clusterApiUrl(CFG.cluster);
}

export function connection(): Connection {
  return new Connection(rpcEndpoint(), "confirmed");
}

/** Загружает секретный ключ владельца из JSON-файла (массив 64 байт). */
export function loadSecretKey(): Uint8Array {
  if (!existsSync(CFG.keypairPath)) {
    throw new Error(
      `Файл ключа не найден: ${CFG.keypairPath}\nСначала выполни: npm run keygen`
    );
  }
  const stat = lstatSync(CFG.keypairPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("KEYPAIR_PATH должен указывать на обычный файл, не symlink");
  }
  if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) {
    throw new Error(`Слишком широкие права у ${CFG.keypairPath}. Выполни: chmod 600 ${CFG.keypairPath}`);
  }

  const raw = JSON.parse(readFileSync(CFG.keypairPath, "utf8")) as unknown;
  if (
    !Array.isArray(raw) ||
    raw.length !== 64 ||
    !raw.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  ) {
    throw new Error("Файл keypair должен быть JSON-массивом ровно из 64 байт");
  }
  return Uint8Array.from(raw);
}

export function loadKeypair(): Keypair {
  return Keypair.fromSecretKey(loadSecretKey());
}

/** Создаёт Umi-инстанс с владельцем в качестве подписанта (identity). */
export function makeUmi(): Umi {
  const umi = createUmi(rpcEndpoint());
  umi.use(mplToolbox());
  umi.use(mplTokenMetadata());
  const kp = umi.eddsa.createKeypairFromSecretKey(loadSecretKey());
  const signer = createSignerFromKeypair(umi, kp);
  umi.use(signerIdentity(signer));
  return umi;
}

/** Адрес минта: из .env (MINT_ADDRESS) или из файла .doffa-mint.json. */
export function resolveMint(): PublicKey {
  if (CFG.mintAddress) return new PublicKey(CFG.mintAddress);
  if (existsSync(MINT_FILE)) {
    const saved = JSON.parse(readFileSync(MINT_FILE, "utf8")) as { mint: string };
    return new PublicKey(saved.mint);
  }
  throw new Error(
    "Не задан адрес минта. Укажи MINT_ADDRESS в .env или сначала выполни npm run create."
  );
}

export function explorerUrl(address: string): string {
  const c = CFG.cluster === "mainnet-beta" ? "" : `?cluster=${CFG.cluster}`;
  return `https://solscan.io/token/${address}${c}`;
}

export function explorerTxUrl(signature: string): string {
  const c = CFG.cluster === "mainnet-beta" ? "" : `?cluster=${CFG.cluster}`;
  return `https://solscan.io/tx/${signature}${c}`;
}
