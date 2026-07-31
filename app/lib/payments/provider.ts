// Абстракция платёжного провайдера (fiat). Магазин НЕ привязан к одному
// провайдеру: конкретная реализация выбирается через adapter. Пока реальный
// провайдер не выбран — используем mock ТОЛЬКО в development и никогда в production.
//
// Реальные платежи не включаются без серверной проверки статуса (verifyPayment /
// getPaymentStatus), поэтому mock не выдаётся за рабочую оплату.

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

export type CreatePaymentInput = {
  orderRef: string;
  amountCents: number;
  currency: string;
  description?: string;
};

export type CreatePaymentResult = {
  providerRef: string;
  /** URL для перехода к оплате (redirect/hosted checkout). */
  redirectUrl: string | null;
  status: PaymentStatus;
};

export interface PaymentProvider {
  readonly id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(providerRef: string): Promise<{ ok: boolean; status: PaymentStatus }>;
  refundPayment(providerRef: string, amountCents?: number): Promise<{ ok: boolean }>;
  getPaymentStatus(providerRef: string): Promise<PaymentStatus>;
}

/**
 * Dev-only mock. Никогда не создаётся в production. Не подтверждает оплату сам —
 * возвращает pending, чтобы серверная логика не считала заказ оплаченным без
 * реальной проверки. Используется только для локальной разработки UI-потоков.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock-dev";
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { providerRef: `mock_${input.orderRef}`, redirectUrl: null, status: "pending" };
  }
  async verifyPayment(): Promise<{ ok: boolean; status: PaymentStatus }> {
    return { ok: false, status: "pending" };
  }
  async refundPayment(): Promise<{ ok: boolean }> {
    return { ok: false };
  }
  async getPaymentStatus(): Promise<PaymentStatus> {
    return "pending";
  }
}

/**
 * Возвращает провайдера, если реальная интеграция подключена (передан secret),
 * иначе null. В production mock не отдаётся никогда.
 * @param secret серверный секрет провайдера (MERCH_PAYMENT_PROVIDER_SECRET)
 * @param isProduction NODE_ENV === "production"
 */
export function getPaymentProvider(
  secret: string | null,
  isProduction: boolean,
): PaymentProvider | null {
  if (secret) {
    // TODO: вернуть реальную реализацию (Stripe/ЮKassa/…) на основе secret.
    // Пока конкретный провайдер не выбран владельцем — оставляем null, чтобы
    // UI показывал «Обычная онлайн-оплата подключается», а не фейковую оплату.
    return null;
  }
  if (isProduction) return null; // никакого mock в проде
  return new MockPaymentProvider();
}
