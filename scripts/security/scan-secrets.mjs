import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const MAX_BLOB_BYTES = 4 * 1024 * 1024;

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: Object.hasOwn(options, "encoding") ? options.encoding : "utf8",
    input: options.input,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const patterns = [
  ["private-key-block", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g],
  ["pgp-private-key", /-----BEGIN PGP PRIVATE KEY BLOCK-----/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/g],
  ["openai-key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b|\bGOCSPX-[0-9A-Za-z_-]{20,}\b/g],
  ["stripe-live-key", /\b(?:sk|rk|pk)_live_[0-9A-Za-z]{16,}\b/g],
  ["slack-token", /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ["vercel-blob-token", /\bvercel_blob_rw_[0-9A-Za-z_=-]{20,}\b/g],
  ["huggingface-token", /\bhf_[A-Za-z0-9]{30,}\b/g],
  ["npm-token", /\bnpm_[A-Za-z0-9]{30,}\b/g],
  ["telegram-bot-token", /\b\d{8,12}:[A-Za-z0-9_-]{35}\b/g],
  ["discord-webhook", /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g],
  ["credentialed-db-url", /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@[^\s"']+/gi],
  ["jwt", /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g],
  // Solana secret keys serialized as base58 are usually 87–88 chars. Public
  // transaction signatures share that shape, so known public values are
  // allowlisted below by exact path + fingerprint rather than ignored broadly.
  ["solana-long-base58", /\b[1-9A-HJ-NP-Za-km-z]{80,90}\b/g],
  ["seed-assignment", /(?:mnemonic|seed(?:_phrase)?|recovery(?:_phrase)?)[^\n=:\"]{0,30}[=:\"]\s*[\"']?(?:[a-z]{3,12}\s+){11,23}[a-z]{3,12}[\"']?/gi],
  ["generic-secret-assignment", /(?:api[_-]?key|client[_-]?secret|access[_-]?token|private[_-]?key|password)\s*[:=]\s*[\"']([A-Za-z0-9_+\/=.-]{24,})[\"']/gi],
];

// Подтверждённые fixtures и публичные on-chain transaction signatures.
// Разрешение связано одновременно с категорией, путём и SHA-256 fingerprint
// значения — изменение примера либо похожая строка в другом файле остановит CI.
const allowedFindings = new Set([
  "credentialed-db-url:docs/SECURITY_AUDIT_2026-07-24.md:84e788bacadb",
  "generic-secret-assignment:scripts/admin-auth.test.ts:e4066272c057",
  "solana-long-base58:docs/LOST_REWARD_VAULT.md:a961b29aa119",
  "solana-long-base58:docs/LOST_REWARD_VAULT.md:aa8becbcfbda",
  "solana-long-base58:docs/LOST_REWARD_VAULT.md:df3f4e36b4f4",
  "solana-long-base58:app/config/ecosystem.ts:aa8becbcfbda",
  "pgp-private-key:scripts/security/scan-secrets.mjs:8a1ddaa7dab8",
  "credentialed-db-url:test/videoStore.test.ts:570539fdc858",
]);

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

const objectLines = git(["rev-list", "--objects", "--all"])
  .split("\n")
  .filter(Boolean);
const objects = new Map();
for (const line of objectLines) {
  const space = line.indexOf(" ");
  const sha = space === -1 ? line : line.slice(0, space);
  const path = space === -1 ? "(unknown)" : line.slice(space + 1);
  if (!objects.has(sha)) objects.set(sha, path);
}

const metadata = git(
  ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
  { input: `${[...objects.keys()].join("\n")}\n` },
);

const blobs = [];
for (const line of metadata.split("\n")) {
  const [sha, type, sizeRaw] = line.split(" ");
  if (type === "blob") blobs.push({ sha, size: Number(sizeRaw), path: objects.get(sha) ?? "(unknown)" });
}

const findings = [];
let textBlobs = 0;
let binaryBlobs = 0;

for (const blob of blobs) {
  if (blob.size > MAX_BLOB_BYTES) {
    binaryBlobs++;
    continue;
  }

  const buffer = git(["cat-file", "blob", blob.sha], { encoding: null });
  if (buffer.includes(0)) {
    binaryBlobs++;
    continue;
  }
  textBlobs++;
  const text = buffer.toString("utf8");

  for (const [category, regex] of patterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const value = match[1] ?? match[0];
      findings.push({
        category,
        sha: blob.sha.slice(0, 12),
        path: blob.path,
        fingerprint: fingerprint(value),
      });
    }
  }

  const keypairArray = /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/g;
  for (const match of text.matchAll(keypairArray)) {
    try {
      const values = JSON.parse(match[0]);
      if (
        Array.isArray(values) &&
        values.length === 64 &&
        values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
      ) {
        findings.push({
          category: "solana-keypair-array",
          sha: blob.sha.slice(0, 12),
          path: blob.path,
          fingerprint: fingerprint(match[0]),
        });
      }
    } catch {
      // Не JSON-массив — не Solana keypair.
    }
  }
}

const uniqueFindings = [
  ...new Map(
    findings.map((finding) => [
      `${finding.category}:${finding.sha}:${finding.path}:${finding.fingerprint}`,
      finding,
    ]),
  ).values(),
];
const unexpectedFindings = uniqueFindings.filter(
  (finding) =>
    !allowedFindings.has(`${finding.category}:${finding.path}:${finding.fingerprint}`),
);
const matchedAllowlistRules = new Set(
  uniqueFindings
    .map((finding) => `${finding.category}:${finding.path}:${finding.fingerprint}`)
    .filter((key) => allowedFindings.has(key)),
);

const suspiciousHistoricalFilenames = [
  ...new Set(
    git(["log", "--all", "--name-only", "--pretty=format:"])
      .split("\n")
      .filter(Boolean)
      .filter((path) =>
        /(^|\/)(?:\.env(?:\..+)?|owner(?:[-_.].*)?\.json|wallet(?:[-_.].*)?\.json|.*keypair.*\.json|credentials.*\.json|id_rsa|.*\.(?:pem|p12|pfx|key|secret))$/i.test(path),
      )
      .filter((path) => !/\.env\.example$/i.test(path)),
  ),
].sort();

const summary = {
  commits: Number(git(["rev-list", "--all", "--count"]).trim()),
  uniqueBlobs: blobs.length,
  textBlobs,
  binaryBlobs,
  allowlistedValues: matchedAllowlistRules.size,
  allowlistedOccurrences: uniqueFindings.length - unexpectedFindings.length,
  findings: unexpectedFindings,
  suspiciousHistoricalFilenames,
};

console.log(JSON.stringify(summary, null, 2));
if (unexpectedFindings.length || suspiciousHistoricalFilenames.length) process.exitCode = 1;
