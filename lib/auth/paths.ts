/**
 * Yönlendirme ve rota koruma yardımcıları (saf, bağımlılıksız).
 * Not: Bunlar kullanıcı deneyimi ve derinlemesine savunma içindir; asıl yetkilendirme
 * Supabase RLS politikaları ve SECURITY DEFINER fonksiyonlarındadır.
 */

export type AppRole = "customer" | "seller" | "admin";

export function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "seller" || value === "admin";
}

/** "next" parametresi yalnızca uygulama içi, tek eğik çizgiyle başlayan yollara izin verir (open-redirect koruması). */
export function safeNextPath(next: string | null | undefined, fallback = "/hesabim"): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\r\n]/.test(value)) return fallback;
  return value;
}

export const SELLER_ROUTE_PREFIX = "/satici-panel";
export const ADMIN_ROUTE_PREFIX = "/yonetim";

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSellerRoute(pathname: string): boolean {
  return hasPrefix(pathname, SELLER_ROUTE_PREFIX);
}

export function isAdminRoute(pathname: string): boolean {
  return hasPrefix(pathname, ADMIN_ROUTE_PREFIX);
}

/** Bu role, bu korumalı rota açılabilir mi? Satıcı paneli: seller/admin. Yönetim: yalnızca admin. */
export function canAccessRoute(role: AppRole | null, pathname: string): boolean {
  if (isAdminRoute(pathname)) return role === "admin";
  if (isSellerRoute(pathname)) return role === "seller" || role === "admin";
  return true;
}

export function isProtectedRoute(pathname: string): boolean {
  return isSellerRoute(pathname) || isAdminRoute(pathname);
}

/** Giriş yapmamış kullanıcıyı girişe, yetkisiz kullanıcıyı uygun ekrana yönlendirecek hedef. */
export function redirectTargetFor(role: AppRole | null, signedIn: boolean, pathname: string, search = ""): string | null {
  if (!isProtectedRoute(pathname)) return null;
  if (!signedIn) return `/giris?next=${encodeURIComponent(`${pathname}${search}`)}`;
  if (canAccessRoute(role, pathname)) return null;
  return isAdminRoute(pathname) ? "/hesabim" : "/satici-basvuru/durum";
}
