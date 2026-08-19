import { createHmac } from "node:crypto";

const MAX_IP_LENGTH = 64;

function firstForwardedValue(value: string | null): string | null {
  const first = value?.split(",", 1)[0]?.trim();
  return first || null;
}

/**
 * Возвращает IP, установленный инфраструктурой. На Vercel используем отдельный
 * системный заголовок первым: обычный x-forwarded-for может быть переписан
 * внешним reverse proxy перед Vercel.
 */
export function clientIp(request: Request): string {
  const candidate =
    firstForwardedValue(request.headers.get("x-vercel-forwarded-for")) ??
    firstForwardedValue(request.headers.get("x-forwarded-for")) ??
    firstForwardedValue(request.headers.get("x-real-ip"));

  if (!candidate || candidate.length > MAX_IP_LENGTH) return "unknown";
  // IP нужен только как ключ rate limit. Отбрасываем управляющие символы и
  // произвольные строки, чтобы не превращать служебную таблицу в лог инъекций.
  return /^[0-9a-f.:]+$/i.test(candidate) ? candidate.toLowerCase() : "unknown";
}

function forwardedOrigin(request: Request): string | null {
  const host =
    firstForwardedValue(request.headers.get("x-forwarded-host")) ??
    firstForwardedValue(request.headers.get("host"));
  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return null;

  const proto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = proto === "http" || proto === "https" ? proto : new URL(request.url).protocol.slice(0, -1);
  return `${protocol}://${host.toLowerCase()}`;
}

/**
 * CSRF-защита для изменяющих запросов. Браузерные запросы с чужого origin
 * отклоняются; отсутствие Origin допускается для CLI/server-to-server клиентов.
 * Sec-Fetch-Site дополнительно закрывает cross-site запросы без Origin.
 */
export function hasTrustedRequestOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const rawOrigin = request.headers.get("origin");
  if (rawOrigin === null) return true;
  if (rawOrigin === "null") return false;

  try {
    const origin = new URL(rawOrigin).origin.toLowerCase();
    const requestOrigin = new URL(request.url).origin.toLowerCase();
    return origin === requestOrigin || origin === forwardedOrigin(request);
  } catch {
    return false;
  }
}

export function crossOriginError(request: Request): Response | null {
  return hasTrustedRequestOrigin(request)
    ? null
    : Response.json({ ok: false, error: "Недопустимый источник запроса" }, { status: 403 });
}

/** Необратимый идентификатор для дедупликации vanity-метрики, без хранения IP. */
export function visitorFingerprint(request: Request, secret: string): string {
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? "unknown";
  return createHmac("sha256", secret)
    .update(`${clientIp(request)}\n${userAgent}`)
    .digest("hex");
}
