import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { Keypair, Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  type Umi,
} from "@metaplex-foundation/umi";

export type Cluster = "devnet" | "mainnet-beta";

export const CFG = {
  cluster: (process.env.CLUSTER ?? "devnet") as Cluster,
  rpcUrl: process.env.RPC_URL?.trim() || "",
  keypairPath: process.env.KEYPAIR_PATH ?? "./owner.json",
  name: process.env.TOKEN_NAME ?? "DOFFA",
  symbol: process.env.TOKEN_SYMBOL ?? "DOFFA",
  decimals: Number(process.env.TOKEN_DECIMALS ?? "6"),
  supply: BigInt(process.env.TOKEN_SUPPLY ?? "100000000"),
  metadataUri: process.env.METADATA_URI ?? "",
  mintAddress: process.env.MINT_ADDRESS?.trim() || "",
};

export const MINT_FILE = ".doffa-mint.json";

export function rpcEndpoint(): string {
  if (CFG.rpcUrl) return CFG.rpcUrl;
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
  const raw = JSON.parse(readFileSync(CFG.keypairPath, "utf8")) as number[];
  return Uint8Array.from(raw);
}

export function loadKeypair(): Keypair {
  return Keypair.fromSecretKey(loadSecretKey());
}

/** Создаёт Umi-инстанс с владельцем в качестве подписанта (identity). */
export function makeUmi(): Umi {
  const umi = createUmi(rpcEndpoint());
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
