import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicConfig } from "@/lib/supabase/env";

/**
 * Sunucu tarafı Supabase istemcisi (Route Handler / Server Component / Server Action).
 * Oturum çerezleri okunur; yazma yalnızca yazılabilir bağlamlarda (Route Handler, Server Action) başarılı olur.
 * Yapılandırma yoksa `null` döner.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getPublicConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const item of items) store.set(item.name, item.value, item.options);
        } catch {
          // Server Component içinden çağrıldıysa çerez yazılamaz; oturum yenilemesini proxy.ts yapar.
        }
      },
    },
  });
}
