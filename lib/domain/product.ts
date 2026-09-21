import { getPlan, type PlanKey } from "@/lib/plans";
import type { AppRole } from "@/lib/auth/paths";
import type { DbProductStatus } from "@/types/database";
import { MarketplaceError } from "./errors";
import { round2 } from "./money";

export const PRODUCT_LIMITS = { name: 160, sku: 64, brand: 80, description: 8000, shortDescription: 300, maxPrice: 10_000_000, maxImages: 10, maxStock: 1_000_000 } as const;

export type ProductStatusUi = "aktif" | "pasif" | "taslak";
export const statusToDb: Record<ProductStatusUi, DbProductStatus> = { aktif: "active", pasif: "passive", taslak: "draft" };
export const statusFromDb: Record<DbProductStatus, ProductStatusUi> = { active: "aktif", passive: "pasif", draft: "taslak" };

// ─── İndirim ────────────────────────────────────────────────────────────────

export type DiscountWindow = { price: number; discountPrice: number | null; discountStart: string | null; discountEnd: string | null };

/** İndirim yalnızca geçerli bir fiyat (0 < indirimli < liste) ve tarih aralığı içinde uygulanır (veritabanı place_order ile aynı). */
export function isDiscountActive(product: DiscountWindow, now: Date = new Date()): boolean {
  const { discountPrice, price } = product;
  if (discountPrice === null || !Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price) return false;
  if (product.discountStart && now.getTime() < new Date(product.discountStart).getTime()) return false;
  if (product.discountEnd && now.getTime() > new Date(product.discountEnd).getTime()) return false;
  return true;
}

export function effectivePrice(product: DiscountWindow, now: Date = new Date()): number {
  return isDiscountActive(product, now) && product.discountPrice !== null ? product.discountPrice : product.price;
}

/** Arayüzdeki gün (YYYY-MM-DD) → yerel gün başı / gün sonu ISO zamanı. */
export function dayStartIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}
export function dayEndIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

// ─── Doğrulama ──────────────────────────────────────────────────────────────

export type ProductDraft = {
  name: string;
  sku: string;
  category: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: DbProductStatus;
  imageCount?: number;
};

/** Veritabanı kısıtlarının aynası: kullanıcıya erken, anlaşılır hata vermek için. (Asıl kontrol veritabanındadır.) */
export function validateProductDraft(draft: ProductDraft): string[] {
  const errors: string[] = [];
  const name = draft.name.trim();
  if (name.length < 1 || name.length > PRODUCT_LIMITS.name) errors.push(`Ürün adı 1–${PRODUCT_LIMITS.name} karakter olmalı.`);
  if (draft.sku.length > PRODUCT_LIMITS.sku) errors.push(`SKU en fazla ${PRODUCT_LIMITS.sku} karakter olabilir.`);
  if (!Number.isFinite(draft.price) || draft.price < 0 || draft.price > PRODUCT_LIMITS.maxPrice) errors.push("Fiyat geçerli bir tutar olmalı.");
  if (draft.discountPrice !== null && !(draft.discountPrice > 0 && draft.discountPrice < draft.price)) errors.push("İndirimli fiyat 0'dan büyük ve normal fiyattan düşük olmalı.");
  if (!Number.isInteger(draft.stock) || draft.stock < 0 || draft.stock > PRODUCT_LIMITS.maxStock) errors.push("Stok 0 veya daha büyük bir tam sayı olmalı.");
  if (!Number.isInteger(draft.lowStockThreshold) || draft.lowStockThreshold < 0) errors.push("Kritik stok seviyesi 0 veya daha büyük bir tam sayı olmalı.");
  if ((draft.imageCount ?? 0) > PRODUCT_LIMITS.maxImages) errors.push(`Bir ürüne en fazla ${PRODUCT_LIMITS.maxImages} görsel eklenebilir.`);
  if (draft.status === "active") {
    if (!(draft.price > 0)) errors.push("Yayındaki ürünün fiyatı 0'dan büyük olmalı.");
    if (!draft.sku.trim()) errors.push("Yayındaki ürünün SKU bilgisi olmalı.");
    if (!draft.category.trim()) errors.push("Yayındaki ürünün kategorisi olmalı.");
  }
  return errors;
}

export function assertValidProduct(draft: ProductDraft): void {
  const errors = validateProductDraft(draft);
  if (errors.length) throw new MarketplaceError("INVALID_PRODUCT", errors[0]);
}

// ─── Müşteriye açık ürün modeli (maliyet ASLA yok) ──────────────────────────

/** Müşteriye gösterilebilecek ürün alanları. Maliyet, ek maliyet, satıcı kimliği ve iç bayraklar bilerek yoktur. */
export type PublicProduct = {
  id: string;
  storeId: string;
  name: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  category: string;
  shortDescription: string;
  description: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  images: string[];
};

export type PublicProductSource = {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  category: string;
  short_description: string;
  description: string;
  price: number;
  discount_price: number | null;
  discount_start: string | null;
  discount_end: string | null;
  stock: number;
};

/**
 * Ürün satırını müşteri modeline çevirir. Alanlar tek tek AÇIKÇA kopyalanır (allow-list);
 * kaynak nesnede `cost`, `extra_cost`, `seller_id` gibi ek alanlar olsa bile çıktıya geçmez.
 */
export function toPublicProduct(row: PublicProductSource, imageUrls: readonly string[], now: Date = new Date()): PublicProduct {
  const price = effectivePrice({ price: row.price, discountPrice: row.discount_price, discountStart: row.discount_start, discountEnd: row.discount_end }, now);
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    sku: row.sku,
    brand: row.brand,
    model: row.model,
    category: row.category,
    shortDescription: row.short_description,
    description: row.description,
    price,
    oldPrice: price < row.price ? round2(row.price) : null,
    stock: row.stock,
    images: [...imageUrls],
  };
}

/** Herkese açık sorgularda ASLA seçilmemesi gereken sütunlar (test bu listeyle sorgu metnini karşılaştırır). */
export const PRIVATE_PRODUCT_FIELDS = ["cost", "extra_cost", "shipping_cost", "packaging_cost", "payment_cost", "other_cost", "seller_id", "deleted_at"] as const;

/** Müşteri ürün sorgusunun sütun listesi (allow-list). */
export const PUBLIC_PRODUCT_COLUMNS = "id, store_id, name, sku, brand, model, category, short_description, description, price, discount_price, discount_start, discount_end, stock, status" as const;

// ─── Satılabilirlik ve yetki ────────────────────────────────────────────────

export type SellableState = { status: DbProductStatus; deletedAt: string | null };

/** Taslak, pasif ve silinmiş ürün satılamaz; mağaza onaylı/aktif değilse hiçbir ürünü satılamaz. */
export function isProductSellable(product: SellableState, storeActive: boolean): boolean {
  return storeActive && product.status === "active" && product.deletedAt === null;
}

export type Actor = { id: string | null; role: AppRole | null };

/** Satıcı yalnızca KENDİ ürününü yönetir (yönetici hariç). Arayüz gizlemesi güvenlik değildir; RLS ayrıca uygular. */
export function canManageProduct(actor: Actor, product: { sellerId: string }): boolean {
  if (!actor.id) return false;
  if (actor.role === "admin") return true;
  return actor.role === "seller" && product.sellerId === actor.id;
}

export type PlanLimitCheck = { ok: boolean; limit: number | null; remaining: number | null };

/** Paketin ürün limiti (lib/plans.ts tek kaynak). Enterprise (null) sınırsız kabul edilir; veritabanı plan_limits ile aynıdır. */
export function checkPlanProductLimit(planKey: PlanKey, currentCount: number, adding = 1): PlanLimitCheck {
  const limit = getPlan(planKey).productLimit;
  if (limit === null) return { ok: true, limit: null, remaining: null };
  const remaining = Math.max(0, limit - currentCount);
  return { ok: currentCount + adding <= limit, limit, remaining };
}
