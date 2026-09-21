/**
 * Supabase ortam değişkeni okuma ve doğrulama.
 *
 * KURALLAR
 *  - Tarayıcıya yalnızca NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY gider.
 *    Anon (publishable) anahtar herkese açıktır; güvenlik RLS politikalarındadır.
 *  - SUPABASE_SERVICE_ROLE_KEY yalnızca sunucuda (lib/supabase/admin.ts) okunur, `NEXT_PUBLIC_` öneki ASLA almaz.
 *  - Yanlışlıkla service_role / secret anahtarı NEXT_PUBLIC_ değişkenine yapıştırılırsa yapılandırma REDDEDİLİR;
 *    böylece anahtar tarayıcı paketine sızmaz.
 *  - Değişkenler yoksa uygulama Aşama 1 demo moduna (localStorage) düşer; hiçbir şey kırılmaz.
 *
 * Bu dosya bilinçli olarak bağımlılıksızdır (test edilebilir).
 */

export type SupabasePublicConfig = { url: string; anonKey: string };

export type ConfigResult = { ok: true; config: SupabasePublicConfig } | { ok: false; reason: "missing" | "invalid-url" | "secret-key" | "invalid-key" };

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(decodeURIComponent(Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Saf doğrulama: ortam değişkeni değerlerinden geçerli bir genel yapılandırma üretir. */
export function validatePublicConfig(rawUrl: string | undefined, rawKey: string | undefined): ConfigResult {
  const url = (rawUrl ?? "").trim().replace(/\/+$/, "");
  const anonKey = (rawKey ?? "").trim();
  if (!url || !anonKey) return { ok: false, reason: "missing" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocalHost(parsed.hostname))) return { ok: false, reason: "invalid-url" };

  // Yeni biçim anahtarlar: sb_publishable_… (genel) ve sb_secret_… (gizli, tarayıcıya ASLA konmaz).
  if (anonKey.startsWith("sb_secret_")) return { ok: false, reason: "secret-key" };
  if (anonKey.startsWith("sb_publishable_")) return { ok: true, config: { url, anonKey } };

  // Eski biçim: JWT. Rolü "anon" olmalı; "service_role" tarayıcıya sızdırılamaz.
  const payload = decodeJwtPayload(anonKey);
  if (!payload) return { ok: false, reason: "invalid-key" };
  if (payload.role === "service_role") return { ok: false, reason: "secret-key" };
  if (payload.role !== "anon") return { ok: false, reason: "invalid-key" };
  return { ok: true, config: { url, anonKey } };
}

/**
 * NOT: `process.env.NEXT_PUBLIC_*` değerleri Next.js tarafından derleme sırasında YALNIZCA
 * bu biçimde (sabit anahtar adıyla) satır içine yazılır; `process.env[name]` biçimi tarayıcıda çalışmaz.
 */
export function getPublicConfigResult(): ConfigResult {
  return validatePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getPublicConfig(): SupabasePublicConfig | null {
  const result = getPublicConfigResult();
  return result.ok ? result.config : null;
}

/** Supabase yapılandırıldı mı? Hayır ise uygulama Aşama 1 demo modunda çalışır. */
export function isSupabaseConfigured(): boolean {
  return getPublicConfigResult().ok;
}

/** Yapılandırma hatasının kullanıcıya/geliştiriciye gösterilebilir açıklaması (anahtar değeri içermez). */
export function describeConfigProblem(result: ConfigResult): string | null {
  if (result.ok) return null;
  switch (result.reason) {
    case "missing":
      return null; // Tanımsız = bilinçli demo modu; hata değil.
    case "invalid-url":
      return "NEXT_PUBLIC_SUPABASE_URL geçerli bir https adresi olmalı.";
    case "secret-key":
      return "NEXT_PUBLIC_SUPABASE_ANON_KEY olarak gizli (service_role / secret) bir anahtar verilmiş. Tarayıcıya yalnızca anon/publishable anahtar konabilir; yapılandırma yok sayıldı.";
    case "invalid-key":
      return "NEXT_PUBLIC_SUPABASE_ANON_KEY geçerli bir anon/publishable anahtar değil.";
  }
}

/** OAuth sağlayıcıları Supabase Dashboard'da etkinleştirilene kadar kapalıdır (sahte giriş gösterilmez). */
export type OAuthProviderKey = "google" | "apple";

export function isOAuthProviderEnabled(provider: OAuthProviderKey): boolean {
  const flag = provider === "google" ? process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED : process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED;
  return flag === "true";
}
