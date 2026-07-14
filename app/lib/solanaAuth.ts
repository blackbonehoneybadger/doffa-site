// Проверка подписи ed25519 от Solana-кошелька (Sign-In with Solana, упрощённо):
// кошелёк подписывает текст сообщения, сервер проверяет подпись публичным
// ключом, который и есть адрес кошелька (base58).
import nacl from "tweetnacl";
import bs58 from "bs58";

/** true, если signature (base64) — валидная подпись message публичным ключом wallet (base58). */
export function verifyWalletSignature(message: string, signatureBase64: string, wallet: string): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signatureBase64, "base64");
    const pubKeyBytes = bs58.decode(wallet);
    if (pubKeyBytes.length !== 32 || sigBytes.length !== 64) return false;
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
  } catch {
    return false;
  }
}
