// Шаг 1. Создаём ключ владельца токена.
// На выходе — файл owner.json (секретный ключ). ХРАНИ ЕГО В ТАЙНЕ.
// Для mainnet лучше использовать аппаратный кошелёк/Phantom; этот ключ удобен для devnet-теста.
import { writeFileSync, existsSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { CFG } from "./config.js";

const path = CFG.keypairPath;

if (existsSync(path)) {
  console.error(`⛔ Файл ${path} уже существует. Удали его вручную, если правда хочешь пересоздать ключ.`);
  process.exit(1);
}

const kp = Keypair.generate();
writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));

console.log("✅ Ключ владельца создан.");
console.log("   Файл:        ", path);
console.log("   Публичный адрес:", kp.publicKey.toBase58());
console.log("\n🔒 ВАЖНО: храни файл", path, "в тайне. Кто им владеет — владеет токеном.");
console.log("   Никому не отправляй его содержимое (включая меня).");
