/**
 * Kimlik bilgisi doğrulaması ve Supabase Auth hata çevirisi (SAF, bağımlılıksız).
 * Not: burada şifre ASLA saklanmaz ya da kaydedilmez; yalnızca biçim kontrol edilir. Gerçek doğrulama Supabase Auth'tadır.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt üst sınırı (72 bayt): daha uzun şifreler sessizce kırpılır, bu yüzden reddedilir. */
export const PASSWORD_MAX_LENGTH = 72;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "E-posta adresini yaz.";
  if (email.length > 150 || !EMAIL_PATTERN.test(email)) return "Geçerli bir e-posta adresi yaz.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_LENGTH) return `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir.`;
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) || !/[0-9]/.test(value)) return "Şifre en az bir harf ve bir rakam içermeli.";
  return null;
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) return `Ad soyad ${NAME_MIN_LENGTH}–${NAME_MAX_LENGTH} karakter olmalı.`;
  return null;
}

export function validateSignIn(input: { email: string; password: string }): string | null {
  return validateEmail(input.email) ?? (input.password ? null : "Şifreni yaz.");
}

export function validateSignUp(input: { name: string; email: string; password: string }): string | null {
  return validateFullName(input.name) ?? validateEmail(input.email) ?? validatePassword(input.password);
}

type AuthErrorShape = { message?: unknown; code?: unknown; status?: unknown; name?: unknown };

export const AUTH_GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar dene.";

/** Supabase Auth hatasını kullanıcıya gösterilebilir, hesap varlığını sızdırmayan Türkçe mesaja çevirir. */
export function friendlyAuthError(error: unknown): string {
  if (typeof error !== "object" || error === null) return AUTH_GENERIC_ERROR;
  const shape = error as AuthErrorShape;
  const code = typeof shape.code === "string" ? shape.code : "";
  const message = typeof shape.message === "string" ? shape.message : "";
  const status = typeof shape.status === "number" ? shape.status : 0;

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.";
  // Yanlış e-posta ile yanlış şifre aynı mesajı verir (hesap varlığı sızdırılmaz).
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "E-posta veya şifre hatalı.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) return "E-posta adresin henüz doğrulanmadı. Gelen kutundaki doğrulama bağlantısına tıkla.";
  if (code === "weak_password" || /password should be|weak password/i.test(message)) return `Şifre yeterince güçlü değil. En az ${PASSWORD_MIN_LENGTH} karakter, harf ve rakam kullan.`;
  if (code === "user_already_exists" || /already registered/i.test(message)) return "Bu e-posta ile kayıt yapılamadı. Giriş yapmayı dene.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429 || /rate limit/i.test(message)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (code === "signup_disabled") return "Yeni üyelik şu anda kapalı.";
  if (code === "provider_disabled" || /provider is not enabled|unsupported provider/i.test(message)) return "Bu giriş yöntemi henüz etkin değil.";
  if (code === "validation_failed" || code === "email_address_invalid") return "Girilen bilgiler geçerli değil. Alanları kontrol et.";
  return AUTH_GENERIC_ERROR;
}
