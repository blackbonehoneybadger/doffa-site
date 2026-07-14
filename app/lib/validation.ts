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

/**
 * Парсит и валидирует JSON-тело запроса по zod-схеме. Возвращает либо
 * { data }, либо { error } с человекочитаемым сообщением (для ответа 400).
 */
export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, error: "Некорректный JSON" };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Некорректные данные" };
  }
  return { ok: true, data: result.data };
}
