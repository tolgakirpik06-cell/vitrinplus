import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicConfig } from "@/lib/supabase/env";

/**
 * Service-role istemcisi: RLS'yi AŞAR. Yalnızca sunucuda ve yalnızca güvenilir işler için
 * (örn. ileride ödeme sağlayıcı webhook'u) kullanılmalıdır.
 *
 *  - `import "server-only"` bu modülün istemci paketine girmesini derleme sırasında engeller.
 *  - Anahtar SUPABASE_SERVICE_ROLE_KEY değişkeninden okunur; `NEXT_PUBLIC_` öneki YOKTUR.
 *  - Şu an uygulamanın hiçbir akışı bu istemciyi kullanmaz; entegrasyonlar için hazır bekler.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const config = getPublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) throw new Error("Supabase service-role yapılandırması eksik.");
  return createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
