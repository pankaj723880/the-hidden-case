export const DEFAULT_ADMIN_EMAIL = "admin123@gmail.com";
export const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function getEffectiveRole(user) {
  return normalizeEmail(user?.email) === DEFAULT_ADMIN_EMAIL ? "admin" : "user";
}
