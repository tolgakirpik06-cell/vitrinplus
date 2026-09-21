/**
 * Mağaza değişiklik planı (SAF, ağ yok).
 *
 * Aşama 1 arayüzü mağaza durumunu `updateShop(değişiklik)` ile eşzamanlı günceller. Supabase modunda arayüz anında
 * güncellenir (iyimser) ve bu modül, sunucuda onaylı durum ile arayüzdeki yeni durum arasındaki FARKI hesaplar;
 * ardından yalnızca fark sunucuya yazılır (kayıt ekle / güncelle / sil, stok için adjust_stock).
 * Böylece mevcut ürün / stok / kampanya ekranları değişmeden gerçek veritabanına yazar.
 */
import type { SellerCampaign, SellerProduct, DemoShop } from "@/lib/demo-marketplace";
import { dayEndIso, dayStartIso, statusToDb } from "@/lib/domain/product";
import type { DbProductStatus } from "@/types/database";

export type ProductColumns = {
  name: string; sku: string | null; barcode: string | null; brand: string | null; model: string | null; category: string;
  short_description: string; description: string; price: number; discount_price: number | null; discount_start: string | null; discount_end: string | null;
  low_stock_threshold: number; auto_passive: boolean; status: DbProductStatus;
};

export type CostColumns = { cost: number; shipping_cost: number; packaging_cost: number; payment_cost: number; other_cost: number };

function textOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** İndirimli fiyat yalnızca 0 < indirimli < liste olduğunda gönderilir (veritabanı kısıtı ile aynı). */
export function dbDiscountPrice(product: Pick<SellerProduct, "price" | "salePrice">): number | null {
  const sale = product.salePrice;
  return sale !== undefined && Number.isFinite(sale) && sale > 0 && sale < product.price ? sale : null;
}

export function toProductColumns(product: SellerProduct): ProductColumns {
  const discount = dbDiscountPrice(product);
  return {
    name: product.name.trim(),
    sku: textOrNull(product.sku),
    barcode: textOrNull(product.barcode),
    brand: textOrNull(product.brand),
    model: textOrNull(product.model),
    category: (product.category ?? "").trim(),
    short_description: (product.shortDescription ?? "").trim(),
    description: (product.description ?? "").trim(),
    price: product.price,
    discount_price: discount,
    discount_start: discount !== null && product.saleStart ? dayStartIso(product.saleStart) : null,
    discount_end: discount !== null && product.saleEnd ? dayEndIso(product.saleEnd) : null,
    low_stock_threshold: product.criticalThreshold ?? 5,
    auto_passive: product.autoPassive ?? false,
    status: statusToDb[product.status ?? "aktif"],
  };
}

export function toCostColumns(product: SellerProduct): CostColumns {
  return { cost: product.cost, shipping_cost: product.costs?.shipping ?? 0, packaging_cost: product.costs?.packaging ?? 0, payment_cost: product.costs?.payment ?? 0, other_cost: product.costs?.other ?? 0 };
}

export type VariantChange = { id: string; label?: string; sku?: string | null; sortOrder?: number };
export type VariantStockChange = { variantId: string; from: number; to: number };

export type ProductUpdate = {
  id: string;
  patch: Partial<ProductColumns>;
  costs: CostColumns | null;
  imagesAdded: string[];
  imagesRemoved: string[];
  /** Görsel listesinde herhangi bir değişiklik olduysa son sıralama (sort_order yeniden yazılır). */
  imageOrder: string[] | null;
  variantsAdded: { id: string; label: string; sku: string | null; stock: number; sortOrder: number }[];
  variantsRemoved: string[];
  variantsChanged: VariantChange[];
  variantStock: VariantStockChange[];
  /** Varyantsız ürünün stok değişimi. */
  stock: { from: number; to: number } | null;
};

export type ShopPlan = {
  storePatch: Record<string, string | number>;
  campaignsAdded: SellerCampaign[];
  campaignsRemoved: string[];
  productsAdded: SellerProduct[];
  productsRemoved: string[];
  productsUpdated: ProductUpdate[];
};

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffColumns(prev: ProductColumns, next: ProductColumns): Partial<ProductColumns> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof ProductColumns)[]) if (!sameJson(prev[key], next[key])) patch[key] = next[key];
  return patch as Partial<ProductColumns>;
}

function diffProduct(prev: SellerProduct, next: SellerProduct): ProductUpdate | null {
  const patch = diffColumns(toProductColumns(prev), toProductColumns(next));
  const prevCosts = toCostColumns(prev);
  const nextCosts = toCostColumns(next);
  const costs = sameJson(prevCosts, nextCosts) ? null : nextCosts;

  const prevImages = prev.images ?? [];
  const nextImages = next.images ?? [];
  const imagesAdded = nextImages.filter((image) => !prevImages.includes(image));
  const imagesRemoved = prevImages.filter((image) => !nextImages.includes(image));
  const imageOrder = imagesAdded.length || imagesRemoved.length || !sameJson(prevImages, nextImages) ? [...nextImages] : null;

  const prevVariants = prev.variants ?? [];
  const nextVariants = next.variants ?? [];
  const variantsAdded = nextVariants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => !prevVariants.some((old) => old.id === variant.id))
    .map(({ variant, index }) => ({ id: variant.id, label: variant.label.trim(), sku: textOrNull(variant.sku), stock: variant.stock ?? 0, sortOrder: index }));
  const variantsRemoved = prevVariants.filter((old) => !nextVariants.some((variant) => variant.id === old.id)).map((old) => old.id);
  const variantsChanged: VariantChange[] = [];
  const variantStock: VariantStockChange[] = [];
  nextVariants.forEach((variant, index) => {
    const old = prevVariants.find((item) => item.id === variant.id);
    if (!old) return;
    const change: VariantChange = { id: variant.id };
    if (old.label.trim() !== variant.label.trim()) change.label = variant.label.trim();
    if (textOrNull(old.sku) !== textOrNull(variant.sku)) change.sku = textOrNull(variant.sku);
    if (prevVariants.findIndex((item) => item.id === variant.id) !== index) change.sortOrder = index;
    if (Object.keys(change).length > 1) variantsChanged.push(change);
    if ((old.stock ?? 0) !== (variant.stock ?? 0)) variantStock.push({ variantId: variant.id, from: old.stock ?? 0, to: variant.stock ?? 0 });
  });

  const hasVariants = nextVariants.length > 0 || prevVariants.length > 0;
  const stock = !hasVariants && prev.stock !== next.stock ? { from: prev.stock, to: next.stock } : null;

  const empty = Object.keys(patch).length === 0 && !costs && !imageOrder && !variantsAdded.length && !variantsRemoved.length && !variantsChanged.length && !variantStock.length && !stock;
  if (empty) return null;
  return { id: next.id, patch, costs, imagesAdded, imagesRemoved, imageOrder, variantsAdded, variantsRemoved, variantsChanged, variantStock, stock };
}

/** Sunucuda onaylı durum (`prev`) ile arayüzdeki yeni durum (`next`) arasındaki fark. */
export function planShopChanges(prev: DemoShop, next: DemoShop): ShopPlan {
  const storePatch: Record<string, string | number> = {};
  if (prev.settings.storeName !== next.settings.storeName) storePatch.name = next.settings.storeName.trim();
  if (prev.settings.description !== next.settings.description) storePatch.description = next.settings.description;
  if (prev.settings.contactEmail !== next.settings.contactEmail) storePatch.contact_email = next.settings.contactEmail;
  if (prev.settings.contactPhone !== next.settings.contactPhone) storePatch.contact_phone = next.settings.contactPhone;
  if (prev.shipping.shippingFee !== next.shipping.shippingFee) storePatch.shipping_fee = next.shipping.shippingFee;
  if (prev.shipping.freeShippingThreshold !== next.shipping.freeShippingThreshold) storePatch.free_shipping_threshold = next.shipping.freeShippingThreshold;
  if (prev.shipping.preparationDays !== next.shipping.preparationDays) storePatch.preparation_days = next.shipping.preparationDays;
  if (prev.shipping.carrier !== next.shipping.carrier) storePatch.carrier = next.shipping.carrier.trim();

  const prevById = new Map(prev.products.map((product) => [product.id, product]));
  const nextById = new Map(next.products.map((product) => [product.id, product]));
  // Örnek veri (sample) yalnızca demo moduna aittir; sunucuya yazılmaz.
  const productsAdded = next.products.filter((product) => !prevById.has(product.id) && !product.sample);
  const productsRemoved = prev.products.filter((product) => !nextById.has(product.id)).map((product) => product.id);
  const productsUpdated: ProductUpdate[] = [];
  for (const product of next.products) {
    const old = prevById.get(product.id);
    if (!old || product.sample) continue;
    const update = diffProduct(old, product);
    if (update) productsUpdated.push(update);
  }

  return {
    storePatch,
    campaignsAdded: next.campaigns.filter((campaign) => !prev.campaigns.some((old) => old.id === campaign.id)),
    campaignsRemoved: prev.campaigns.filter((old) => !next.campaigns.some((campaign) => campaign.id === old.id)).map((old) => old.id),
    productsAdded,
    productsRemoved,
    productsUpdated,
  };
}

export function isEmptyPlan(plan: ShopPlan): boolean {
  return !Object.keys(plan.storePatch).length && !plan.campaignsAdded.length && !plan.campaignsRemoved.length && !plan.productsAdded.length && !plan.productsRemoved.length && !plan.productsUpdated.length;
}

/** Veri URL'si (henüz yüklenmemiş yerel görsel) mi? */
export function isLocalImage(url: string): boolean {
  return url.startsWith("data:");
}

/** Yüklenen görsellerin veri URL'lerini kalıcı adresleriyle değiştirir (yeni nesne döndürür). */
export function replaceImageUrls(shop: DemoShop, replacements: ReadonlyMap<string, string>): DemoShop {
  if (!replacements.size) return shop;
  return { ...shop, products: shop.products.map((product) => (product.images?.some((image) => replacements.has(image)) ? { ...product, images: product.images.map((image) => replacements.get(image) ?? image) } : product)) };
}
