import type { Product, Store } from "@/types";
import { PUBLIC_PRODUCT_COLUMNS, toPublicProduct, type PublicProductSource } from "@/lib/domain/product";
import { normalizeSearch } from "@/lib/catalog-normalize";
import type { Page } from "@/lib/repositories/types";
import { first, rows, type Client, unwrap } from "./common";
import { idFromProductSlug, mapPublicProduct } from "./mappers";

type CatalogRow = PublicProductSource & {
  slug: string;
  stores: { name: string; description: string; slug: string; shipping_fee: number; free_shipping_threshold: number };
  product_images: { url: string; sort_order: number }[];
  product_variants: { label: string; stock: number; sort_order: number; is_active: boolean }[];
};
const SELECT = `${PUBLIC_PRODUCT_COLUMNS}, slug, stores, product_images, product_variants`;

export function mapCatalogRow(row: CatalogRow, now = new Date()): Product {
  const images = [...(row.product_images ?? [])].sort((a,b) => a.sort_order - b.sort_order).map(i => i.url);
  const variantOptions = [...(row.product_variants ?? [])].filter(v => v.is_active).sort((a,b) => a.sort_order - b.sort_order).map(v => ({ label: v.label, stock: v.stock }));
  const product = mapPublicProduct({ ...toPublicProduct(row, images, now), variantOptions }, {
    name: row.stores.name, description: row.stores.description,
    shippingFee: Number(row.stores.shipping_fee), freeShippingThreshold: Number(row.stores.free_shipping_threshold),
  });
  return { ...product, slug: row.slug, storeSlug: row.stores.slug };
}
export function sanitizeSearch(query: string): string { return normalizeSearch(query).slice(0, 100); }
export type CatalogOptions = {
  query?: string; page?: number; pageSize?: number; storeSlug?: string;
  categories?: string[]; brand?: string; minPrice?: number; maxPrice?: number;
  sort?: string; inStock?: boolean; discounted?: boolean;
};
function bounded(value: number | undefined, fallback: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value!))) : fallback;
}
export async function searchPublicProducts(client: Client, options: CatalogOptions = {}): Promise<Page<Product>> {
  const size = Math.max(1, bounded(options.pageSize, 24, 100));
  const page = bounded(options.page, 0, 9999);
  let query = client.from("public_catalog").select(SELECT, { count: "exact" });
  for (const token of sanitizeSearch(options.query ?? "").split(" ").filter(Boolean)) query = query.like("search_text", `%${token}%`);
  if (options.storeSlug) query = query.eq("store_slug", options.storeSlug);
  if (options.categories?.length) query = query.in("category_key", options.categories.map(normalizeSearch));
  if (options.brand) query = query.eq("brand", options.brand.slice(0, 80));
  if (Number.isFinite(options.minPrice)) query = query.gte("effective_price", options.minPrice!);
  if (Number.isFinite(options.maxPrice)) query = query.lte("effective_price", options.maxPrice!);
  if (options.inStock) query = query.gt("stock", 0);
  if (options.discounted) query = query.eq("is_discounted", true);
  query = options.sort === "fiyat-artan" || options.sort === "fiyat-azalan"
    ? query.order("effective_price", { ascending: options.sort === "fiyat-artan" })
    : query.order("created_at", { ascending: false });
  const result = await query.order("id").range(page * size, page * size + size - 1);
  return { items: rows<CatalogRow>(unwrap(result)).map(row => mapCatalogRow(row)), total: result.count ?? 0 };
}
export async function getPublicProduct(client: Client, slug: string): Promise<Product | null> {
  const id = idFromProductSlug(slug);
  if (!id) return null;
  const row = first<CatalogRow>(unwrap(await client.from("public_catalog").select(SELECT).eq("id", id).maybeSingle()));
  return row ? mapCatalogRow(row) : null;
}
export async function getPublicProducts(client: Client, slugs: readonly string[]): Promise<Product[]> {
  const ids = [...new Set(slugs.map(idFromProductSlug).filter((id): id is string => id !== null))];
  const result: Product[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const data = unwrap(await client.from("public_catalog").select(SELECT).in("id", ids.slice(offset, offset + 100)));
    result.push(...rows<CatalogRow>(data).map(row => mapCatalogRow(row)));
  }
  return result;
}
type StoreRow = { id: string; slug: string; name: string; description: string; logo_url: string | null; banner_url: string | null; contact_email: string; contact_phone: string; product_count: number };
const STORE_SELECT = "id, slug, name, description, logo_url, banner_url, contact_email, contact_phone, product_count";
function mapStore(row: StoreRow): Store {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description,
    logoUrl: row.logo_url, bannerUrl: row.banner_url, contactEmail: row.contact_email, contactPhone: row.contact_phone,
    categoryLabel: "Satıcı mağazası", live: true, rating: 0, followerCount: "", productCount: Number(row.product_count), tone: "brand" };
}
export async function listPublicStores(client: Client, options: { query?: string; page?: number; pageSize?: number; slug?: string } = {}): Promise<Page<Store>> {
  const size = Math.max(1, bounded(options.pageSize, 24, 100));
  const page = bounded(options.page, 0, 9999);
  let query = client.from("public_stores").select(STORE_SELECT, { count: "exact" });
  if (options.slug) query = query.eq("slug", options.slug);
  for (const token of sanitizeSearch(options.query ?? "").split(" ").filter(Boolean)) query = query.like("search_text", `%${token}%`);
  const result = await query.order("created_at", { ascending: false }).order("id").range(page * size, page * size + size - 1);
  return { items: rows<StoreRow>(unwrap(result)).map(mapStore), total: result.count ?? 0 };
}
