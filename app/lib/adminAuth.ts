// Обратная совместимость: старые импорты adminAuth → единый auth.
export {
  checkAdminPassword as checkPassword,
  createLegacyAdminSession as createSession,
  destroyUserSession as destroySession,
  isAdminAuthed as isAuthed,
  isLegacyAdminAuthed,
  requireAdmin,
} from "./auth";
