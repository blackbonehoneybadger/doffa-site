// Общий слой обращения к внешним API.
//
// Главное правило: внешний сервис НИКОГДА не должен ронять страницу и никогда
// не должен приводить к показу выдуманных данных. Любая ошибка (таймаут, 500,
// не-JSON, неожиданная форма ответа) — это null, а вызывающий код обязан
// честно показать «данных нет», а не подставлять заглушку.

const DEFAULT_TIMEOUT_MS = 4000;

export type FetchJsonOptions = {
  /** Сколько секунд Next кэширует ответ на сервере (ISR для fetch). */
  revalidate: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

/**
 * Запрашивает JSON у внешнего сервиса. Возвращает null при любой проблеме —
 * не бросает исключений.
 */
export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", ...(opts.headers ?? {}) },
      next: { revalidate: opts.revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    // Сеть недоступна, таймаут или тело не JSON — для сайта это просто «нет данных».
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Достаёт число из неизвестного значения. null, если это не конечное число. */
export function asNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Безопасный доступ к полю объекта неизвестной формы. */
export function prop(v: unknown, key: string): unknown {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>)[key] : undefined;
}
