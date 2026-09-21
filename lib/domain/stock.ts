import { MarketplaceError } from "./errors";
import type { DbProductStatus, DbStockMovementType } from "@/types/database";

/** Veritabanı adjust_stock ile aynı üst sınır. */
export const MAX_STOCK = 1_000_000;

export type StockMode = "add" | "remove" | "set";

export type StockChange = { before: number; after: number; change: number };

function assertCount(value: number, allowZero: boolean): void {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1) || value > MAX_STOCK) throw new MarketplaceError("INVALID_QUANTITY", "Adet geçersiz.");
}

/**
 * Elle stok işlemi (ekle / çıkar / ayarla). Sonuç ASLA 0'ın altına düşmez; düşecekse hata fırlatır (STOCK_NEGATIVE).
 * Veritabanı adjust_stock fonksiyonunun birebir aynasıdır.
 */
export function applyStockChange(before: number, mode: StockMode, quantity: number): StockChange {
  if (!Number.isInteger(before) || before < 0) throw new MarketplaceError("INVALID_QUANTITY", "Mevcut stok geçersiz.");
  assertCount(quantity, mode === "set");
  const after = mode === "add" ? before + quantity : mode === "remove" ? before - quantity : quantity;
  if (after < 0) throw new MarketplaceError("STOCK_NEGATIVE", `Stok 0'ın altına düşemez (mevcut: ${before}).`);
  if (after > MAX_STOCK) throw new MarketplaceError("INVALID_QUANTITY", "Stok üst sınırı aşıldı.");
  return { before, after, change: after - before };
}

/** Satış: stok yetmiyorsa hata (OUT_OF_STOCK); stok eksiye düşürülemez. */
export function reserveStock(before: number, quantity: number): StockChange {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new MarketplaceError("INVALID_QUANTITY", "Ürün adedi geçersiz.");
  if (quantity > before) throw new MarketplaceError("OUT_OF_STOCK", `Stokta ${before} adet var.`);
  return { before, after: before - quantity, change: -quantity };
}

/** İptal / iade sonrası stok geri yükleme. */
export function restoreStock(before: number, quantity: number): StockChange {
  if (!Number.isInteger(quantity) || quantity < 1) throw new MarketplaceError("INVALID_QUANTITY", "Adet geçersiz.");
  return { before, after: before + quantity, change: quantity };
}

export type MovementDraft = {
  type: DbStockMovementType;
  change: StockChange;
  reference?: { type: "order" | "return" | "manual"; id?: string };
  note?: string;
};

/** Denetlenebilir stok hareketi: önce/sonra değerleri ve referans birlikte tutulur (stock_after = stock_before + değişim). */
export function buildMovement(draft: MovementDraft): { type: DbStockMovementType; quantityChange: number; stockBefore: number; stockAfter: number; referenceType: string | null; referenceId: string | null; note: string | null } {
  if (draft.change.change === 0) throw new MarketplaceError("NO_CHANGE", "Değişiklik yok.");
  if (draft.change.after !== draft.change.before + draft.change.change) throw new MarketplaceError("INVALID_QUANTITY", "Stok hareketi tutarsız.");
  return {
    type: draft.type,
    quantityChange: draft.change.change,
    stockBefore: draft.change.before,
    stockAfter: draft.change.after,
    referenceType: draft.reference?.type ?? null,
    referenceId: draft.reference?.id ?? null,
    note: draft.note?.trim().slice(0, 300) || null,
  };
}

/** Stok tükenince ürün otomatik pasife alınmalı mı? (yalnızca aktif ve "otomatik pasif" açık ürün) */
export function shouldAutoPassive(product: { totalStock: number; autoPassive: boolean; status: DbProductStatus }): boolean {
  return product.totalStock <= 0 && product.autoPassive && product.status === "active";
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return "out";
  return stock <= threshold ? "low" : "ok";
}

/** Varyantlı ürünün toplam stoğu = etkin varyant stoklarının toplamı (veritabanı tetikleyicisiyle aynı). */
export function totalVariantStock(variants: readonly { stock: number; isActive?: boolean }[]): number {
  return variants.filter((variant) => variant.isActive !== false).reduce((total, variant) => total + variant.stock, 0);
}
