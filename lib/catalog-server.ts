import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicProduct, listPublicStores, searchPublicProducts, type CatalogOptions } from "@/lib/repositories/supabase/catalog";

// Network/schema errors propagate to the route error UI, never to mock data.
export async function catalogProducts(options: CatalogOptions = {}) {
  const client = await createSupabaseServerClient();
  return client ? searchPublicProducts(client, options) : { items: [], total: 0 };
}
export async function catalogStores(options: Parameters<typeof listPublicStores>[1] = {}) {
  const client = await createSupabaseServerClient();
  return client ? listPublicStores(client, options) : { items: [], total: 0 };
}
export const catalogProduct = cache(async (slug: string) => {
  const client = await createSupabaseServerClient();
  return client ? getPublicProduct(client, slug) : null;
});
export const catalogStore = cache(async (slug: string) => (await catalogStores({ slug, pageSize: 1 })).items[0] ?? null);
