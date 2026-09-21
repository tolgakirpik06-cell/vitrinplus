/**
 * Hata modeli. Veritabanı fonksiyonları kullanıcıya gösterilebilir Türkçe mesaj + makine okunur `hint` kodu döndürür.
 * Bu modül ham veritabanı hatasını (tablo/kolon adı sızdırabilir) kullanıcıya gösterilebilir bir mesaja çevirir.
 */
export class MarketplaceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "MarketplaceError";
    this.code = code;
  }
}

export const GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar dene.";
export const NETWORK_ERROR = "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.";
export const SESSION_ERROR = "Oturumunun süresi doldu. Lütfen yeniden giriş yap.";
export const FORBIDDEN_ERROR = "Bu işlem için yetkin yok.";

type ErrorShape = { message?: unknown; hint?: unknown; code?: unknown; name?: unknown };

function asShape(error: unknown): ErrorShape | null {
  return typeof error === "object" && error !== null ? (error as ErrorShape) : null;
}

/** Makine okunur hata kodu (RPC `hint` değeri, yoksa veritabanı kodu). */
export function errorCode(error: unknown): string | null {
  if (error instanceof MarketplaceError) return error.code;
  const shape = asShape(error);
  if (!shape) return null;
  if (typeof shape.hint === "string" && shape.hint) return shape.hint;
  return typeof shape.code === "string" && shape.code ? shape.code : null;
}

/**
 * Kullanıcıya gösterilecek güvenli mesaj.
 *  - Kendi (Türkçe) MarketplaceError / Error mesajları olduğu gibi gösterilir.
 *  - Veritabanı `P0001` (RPC iş kuralı) mesajları Türkçedir ve gösterilir.
 *  - Diğer ham veritabanı mesajları (RLS, kısıt adı, tablo adı) ASLA gösterilmez; genel bir mesaja çevrilir.
 */
export function friendlyError(error: unknown, fallback: string = GENERIC_ERROR): string {
  if (error instanceof MarketplaceError) return error.message;
  const shape = asShape(error);
  if (!shape) return fallback;
  const message = typeof shape.message === "string" ? shape.message : "";
  const code = typeof shape.code === "string" ? shape.code : "";
  const hint = typeof shape.hint === "string" ? shape.hint : "";

  if ((shape.name === "TypeError" || code === "") && /failed to fetch|networkerror|load failed|network request failed/i.test(message)) return NETWORK_ERROR;
  if (code === "P0001") return message || fallback;
  if (code === "42501") return hint && message && !/row-level security|permission denied/i.test(message) ? message : FORBIDDEN_ERROR;
  if (code === "PGRST301" || code === "PGRST303" || /jwt/i.test(message)) return SESSION_ERROR;
  if (code === "23505") return "Bu kayıt zaten mevcut.";
  if (code === "23503") return "Bu kayıt başka kayıtlarla ilişkili olduğu için işlem yapılamadı.";
  if (code === "23514" || code === "23502" || code === "22P02" || code === "22003") return "Girilen bilgiler geçerli değil. Alanları kontrol et.";
  if (code === "" && shape.name !== undefined && message) return message; // Kendi ürettiğimiz düz Error (Türkçe doğrulama mesajı).
  return fallback;
}
