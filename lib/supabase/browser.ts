import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicConfig } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

/**
 * Tarayıcı Supabase istemcisi (tekil). Yapılandırma yoksa `null` döner → uygulama demo modunda kalır.
 * Yalnızca anon anahtarı kullanır; her sorgu kullanıcının oturumuyla ve RLS politikalarıyla çalışır.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (cached) return cached;
  const config = getPublicConfig();
  if (!config) return null;
  const created = createBrowserClient(config.url, config.anonKey);
  // Sunucuda (SSR) istekler arasında paylaşılmaması için yalnızca tarayıcıda önbelleğe alınır.
  if (typeof window !== "undefined") cached = created;
  return created;
}
