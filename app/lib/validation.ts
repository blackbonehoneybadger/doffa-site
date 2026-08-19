// Единая точка проверки входящих JSON-тел запросов. TypeScript-касты вида
// `body as X` ничего не проверяют в рантайме — здесь используем zod, чтобы
// внешние данные (кошелёк, подпись, никнейм, URL видео) валидировались реально.
import { z } from "zod";

export const walletSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Некорректный адрес кошелька");

export const nonceRequestSchema = z.object({ wallet: walletSchema });

export const verifyRequestSchema = z.object({
  token: z.string().min(1).max(1024),
  signature: z.string().min(1).max(512),
});

export const profilePatchSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(256),
});

// Регистрация уже загруженного в Blob видео: путь должен лежать в нашей папке,
// а host URL — принадлежать Vercel Blob (нельзя зарегистрировать чужой URL).
export const videoRegisterSchema = z.object({
  url: z.string().url().max(2048),
  pathname: z.string().min(1).max(512),
});

// Заявка на кожаное изделие на заказ (форма /merch). `website` — honeypot:
// реальные люди его не заполняют, боты — да. Только name/contact/consent строго
// обязательны, остальное опционально.
export const merchOrderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contact: z.string().trim().min(1).max(200),
  productType: z.string().trim().max(120).optional().default(""),
  quantity: z.string().trim().max(60).optional().default(""),
  personalization: z.string().trim().max(60).optional().default(""),
  persoText: z.string().trim().max(200).optional().default(""),
  idea: z.string().trim().max(2000).optional().default(""),
  deadline: z.string().trim().max(120).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  consent: z.literal(true),
  // Боту даём пройти схему, чтобы ниже тихо принять honeypot и ничего не писать
  // в БД. max(0) делал эту ветку недостижимой и возвращал ботам явный 400.
  website: z.string().max(200).optional().default(""),
});

export type JsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: 400 | 413 | 415 };

const DEFAULT_MAX_JSON_BYTES = 16 * 1024;

async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const value = Number(declared);
    if (!Number.isFinite(value) || value < 0 || value > maxBytes) return null;
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Читает JSON с ограничением по реальному числу байт, включая chunked body. */
export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<JsonBodyResult<unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType && contentType !== "application/json" && !contentType.endsWith("+json")) {
    return { ok: false, error: "Ожидается JSON", status: 415 };
  }

  let text: string | null;
  try {
    text = await readLimitedText(request, maxBytes);
  } catch {
    return { ok: false, error: "Не удалось прочитать запрос", status: 400 };
  }
  if (text === null) {
    return { ok: false, error: "Тело запроса слишком большое", status: 413 };
  }

  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Некорректный JSON", status: 400 };
  }
}

/**
 * Парсит и валидирует JSON-тело запроса по zod-схеме. Возвращает либо
 * { data }, либо { error } с человекочитаемым сообщением (для ответа 400).
 */
export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<JsonBodyResult<T>> {
  const body = await readJsonBody(request, maxBytes);
  if (!body.ok) return body;
  const result = schema.safeParse(body.data);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Некорректные данные",
      status: 400,
    };
  }
  return { ok: true, data: result.data };
}
