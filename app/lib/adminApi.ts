import "server-only";

import { isAuthed } from "./adminAuth";
import { reportServerError } from "./serverError";

/** Единая fail-closed проверка админ-сессии для route handlers. */
export async function requireAdminApi(): Promise<Response | null> {
  try {
    return (await isAuthed())
      ? null
      : Response.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  } catch (error) {
    reportServerError("admin auth storage unavailable", error);
    return Response.json(
      { ok: false, error: "Сервис временно недоступен" },
      { status: 503 },
    );
  }
}
