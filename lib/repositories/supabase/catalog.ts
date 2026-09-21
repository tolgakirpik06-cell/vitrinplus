/**
 * Herkese açık ürün kataloğu. Yalnızca müşteriye gösterilebilecek sütunlar seçilir (PUBLIC_PRODUCT_COLUMNS);
 * maliyet tablosuna burada ASLA dokunulmaz.
 */
import type { Product } from "@/types";
import { PUBLIC_PRODUCT_COLUMNS, toPublicProduct, type PublicProductSource } from "@/lib/domain/product";
import type { Page } from "@/lib/repositories/types";
import { first, rows, type Client, unwrap } from "./common";
import { idFromProductSlug, mapPublicProduct } from "./mappers";

type StoreInfo = { name: string; description: string; slug: string; shipping_fee: number; free_shipping_threshold: number };
type CatalogRow = PublicProductSource & { stores: StoreInfo | StoreInfo[] | null; product_images: { url: string; sort_order: number }[] | null; product_variants: { label: string; stock: number; sort_order: number; is_active: boolean }[] | null };

const SELECT = `${PUBLIC_PRODUCT_COLUMNS}, stores!inner(name, description, slug, is_active, shipping_fee, free_shipping_threshold), product_images(url, sort_order), product_variants(label, stock, sort_order, is_active)`;

function storeOf(row: CatalogRow): { name: string; description: string; shippingFee: number; freeShippingThreshold: number } {
  const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
  return { name: store?.name ?? "Mağaza", description: store?.description ?? "", shippingFee: Number(store?.shipping_fee ?? 0), freeShippingThreshold: Number(store?.free_shipping_threshold ?? 0) };
}

function toProduct(row: CatalogRow, now: Date): Product {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((image) => image.url);
  const variantOptions = [...(row.product_variants ?? [])].filter((variant) => variant.is_active).sort((a, b) => a.sort_order - b.sort_order).map((variant) => ({ label: variant.label, stock: variant.stock }));
  return mapPublicProduct({ ...toPublicProduct(row, images, now), variantOptions }, storeOf(row));
}

/** PostgREST `or()` süzgecini bozabilecek karakterleri temizler. */
export function sanitizeSearch(query: string): string {
  return query.replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function searchPublicProducts(client: Client, options: { query?: string; page?: number; pageSize?: number; storeSlug?: string } = {}): Promise<Page<Product>> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 48, 1), 100);
  const page = Math.max(options.page ?? 0, 0);
  let query = client
    .from("products")
    .select(SELECT, { count: "exact" })
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("stores.is_active", true)
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  const term = sanitizeSearch(options.query ?? "");
  if (term) query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,brand.ilike.%${term}%`);
  if (options.storeSlug) query = query.eq("stores.slug", options.storeSlug);
  const result = await query;
  const data = unwrap(result);
  const now = new Date();
  return { items: rows<CatalogRow>(data).map((row) => toProduct(row, now)), total: result.count ?? 0 };
}

/** Tek ürünü (slug: demo-<uuid>) getirir; satışta değilse `null`. */
export async function getPublicProduct(client: Client, slug: string): Promise<Product | null> {
  const id = idFromProductSlug(slug);
  if (!id) return null;
  const data = unwrap(await client.from("products").select(SELECT).eq("id", id).eq("status", "active").is("deleted_at", null).eq("stores.is_active", true).maybeSingle());
  const row = first<CatalogRow>(data);
  return row ? toProduct(row, new Date()) : null;
}

/** Sepet / favori çözümlemesi için birden çok ürünü tek sorguda getirir. */
export async function getPublicProducts(client: Client, slugs: readonly string[]): Promise<Product[]> {
  const ids = slugs.map(idFromProductSlug).filter((id): id is string => id !== null);
  if (!ids.length) return [];
  const data = unwrap(await client.from("products").select(SELECT).in("id", ids.slice(0, 100)).eq("status", "active").is("deleted_at", null).eq("stores.is_active", true));
  const now = new Date();
  return rows<CatalogRow>(data).map((row) => toProduct(row, now));
}
