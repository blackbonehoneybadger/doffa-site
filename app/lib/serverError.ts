/**
 * Пишет в серверный лог только безопасный минимум. Тексты ошибок БД/RPC/SDK
 * могут содержать URL с credentials, поэтому наружу и в обычный лог их не
 * копируем целиком.
 */
export function reportServerError(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error;
  const rawCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const code = /^[A-Z0-9_-]{1,80}$/i.test(rawCode) ? rawCode : undefined;
  console.error(context, code ? { name, code } : { name });
}
