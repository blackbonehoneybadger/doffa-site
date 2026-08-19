export type TokenCluster = "devnet" | "mainnet-beta";

export const MAINNET_CONFIRMATION = "I_UNDERSTAND_TRANSACTIONS_ARE_IRREVERSIBLE";

/**
 * На mainnet одного случайно оставленного значения в .env недостаточно:
 * оператор обязан одновременно передать флаг с точным адресом минта (либо
 * CREATE_NEW_MINT до создания). В devnet предохранитель не нужен.
 */
export function assertMainnetWriteEnabled(
  cluster: TokenCluster,
  operation: string,
  target: string,
  options: { acknowledgement?: string; argv?: string[] } = {},
): void {
  if (cluster !== "mainnet-beta") return;

  const acknowledgement = options.acknowledgement ?? process.env.DOFFA_MAINNET_CONFIRMATION;
  const argv = options.argv ?? process.argv.slice(2);
  const expectedFlag = `--confirm-mainnet=${target}`;

  if (acknowledgement !== MAINNET_CONFIRMATION || !argv.includes(expectedFlag)) {
    throw new Error(
      [
        `Mainnet ${operation} заблокирован предохранителем.`,
        `Для осознанного запуска одновременно задай DOFFA_MAINNET_CONFIRMATION=${MAINNET_CONFIRMATION}`,
        `и передай точный флаг ${expectedFlag}`,
      ].join("\n"),
    );
  }
}

/** Точный перевод UI-количества в base units без Number/Math.round. */
export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Некорректное число decimals");
  }

  const normalized = value.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(normalized);
  if (!match) throw new Error("Количество должно быть положительным десятичным числом");

  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    throw new Error(`Максимум ${decimals} знаков после запятой`);
  }

  const scale = 10n ** BigInt(decimals);
  const amount = BigInt(match[1]) * scale + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (amount <= 0n) throw new Error("Количество должно быть больше нуля");
  return amount;
}

/** Поля on-chain memo ограничены печатным безопасным форматом и размером. */
export function validateMemoField(value: string, name: string, maxLength: number): string {
  if (value.length < 1 || value.length > maxLength || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error(`${name}: разрешены 1–${maxLength} символов A-Z, a-z, 0-9, точка, _, : и -`);
  }
  return value;
}
