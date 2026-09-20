/** Ürünler ekranı için saf veri yardımcıları (filtre, sıralama, sayaçlar). */
import type { SellerProduct } from "@/lib/demo-marketplace";
import { activeSalePrice } from "@/lib/demo-marketplace";
import { estimatedUnitProfit, unitCost } from "@/lib/profit";
import { simulatedViews, type StockRow } from "@/lib/seller-analytics";

export type ProductTab = "tumu" | "aktif" | "pasif" | "taslak" | "kritik" | "stokyok";
export type ProductSort = "yeni" | "ad" | "fiyat-artan" | "fiyat-azalan" | "stok-az" | "cok-satan";
export type ProductDisplayState = "aktif" | "pasif" | "taslak" | "stokyok";

export type ProductRow = {
  product: SellerProduct;
  stock: StockRow;
  /** Ek maliyetler dahil birim maliyet; maliyet girilmemişse 0. */
  unitCost: number;
  /** Ürün başına tahmini kâr; maliyet bilinmiyorsa null. */
  unitProfit: number | null;
  sold: number;
  /** DEMO tahmini görüntülenme. */
  views: number;
  order: number;
};

export const productTabs: ProductTab[] = ["tumu", "aktif", "pasif", "taslak", "kritik", "stokyok"];

export function buildProductRows(stockRows: StockRow[]): ProductRow[] {
  return stockRows.map((stock, index) => ({
    product: stock.product,
    stock,
    unitCost: unitCost(stock.product),
    unitProfit: estimatedUnitProfit({ price: stock.product.price, cost: stock.product.cost, costs: stock.product.costs }),
    sold: stock.soldTotal,
    views: simulatedViews(stock.product.id, stock.soldTotal),
    order: index,
  }));
}

export function displayState(row: ProductRow): ProductDisplayState {
  const status = row.product.status;
  if (status === "taslak") return "taslak";
  if (status === "pasif") return "pasif";
  return row.stock.status === "out" ? "stokyok" : "aktif";
}

export function matchesTab(row: ProductRow, tab: ProductTab): boolean {
  switch (tab) {
    case "tumu":
      return true;
    case "aktif":
      return row.product.status !== "pasif" && row.product.status !== "taslak";
    case "pasif":
      return row.product.status === "pasif";
    case "taslak":
      return row.product.status === "taslak";
    case "kritik":
      return row.stock.status === "critical";
    case "stokyok":
      return row.stock.status === "out";
  }
}

export function countTabs(rows: ProductRow[]): Record<ProductTab, number> {
  const counts: Record<ProductTab, number> = { tumu: 0, aktif: 0, pasif: 0, taslak: 0, kritik: 0, stokyok: 0 };
  for (const tab of productTabs) counts[tab] = rows.filter((row) => matchesTab(row, tab)).length;
  return counts;
}

export type ProductExtraFilters = { missingCost: boolean; onSale: boolean; lowMargin: boolean };
export const noExtraFilters: ProductExtraFilters = { missingCost: false, onSale: false, lowMargin: false };

export function filterProducts(rows: ProductRow[], input: { tab: ProductTab; query: string; category: string; extra: ProductExtraFilters; now: Date }): ProductRow[] {
  const needle = input.query.trim().toLocaleLowerCase("tr-TR");
  return rows.filter((row) => {
    if (!matchesTab(row, input.tab)) return false;
    if (input.category && row.product.category !== input.category) return false;
    if (needle) {
      const haystack = [row.product.name, row.product.sku, row.product.category, row.product.brand ?? "", row.product.model ?? ""].join(" ").toLocaleLowerCase("tr-TR");
      if (!haystack.includes(needle)) return false;
    }
    if (input.extra.missingCost && row.product.cost > 0) return false;
    if (input.extra.onSale && activeSalePrice(row.product, input.now) === null) return false;
    if (input.extra.lowMargin && (row.unitProfit === null || row.product.price <= 0 || row.unitProfit / row.product.price >= 0.1)) return false;
    return true;
  });
}

export function sortProducts(rows: ProductRow[], sort: ProductSort): ProductRow[] {
  const copy = [...rows];
  const created = (row: ProductRow) => (row.product.createdAt ? new Date(row.product.createdAt).getTime() : 0);
  switch (sort) {
    case "yeni":
      // Kayıt tarihi olmayan eski ürünlerde dizideki sıra korunur (yeni eklenen başta).
      return copy.sort((a, b) => created(b) - created(a) || a.order - b.order);
    case "ad":
      return copy.sort((a, b) => a.product.name.localeCompare(b.product.name, "tr-TR"));
    case "fiyat-artan":
      return copy.sort((a, b) => a.product.price - b.product.price);
    case "fiyat-azalan":
      return copy.sort((a, b) => b.product.price - a.product.price);
    case "stok-az":
      return copy.sort((a, b) => a.stock.sellable - b.stock.sellable);
    case "cok-satan":
      return copy.sort((a, b) => b.sold - a.sold);
  }
}

export function productCategories(rows: ProductRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr-TR"));
}
