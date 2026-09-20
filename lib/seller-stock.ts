/**
 * Stok Yönetimi ekranı için SAF yardımcılar: sekmeler, süzme, taslak (kaydedilmemiş) düzenleme çözümleme.
 * React'e bağımlı değildir.
 */
import type { SellerProduct } from "@/lib/demo-marketplace";
import type { StockMovement } from "@/lib/seller-ops";
import type { StockRow, StockStatus } from "@/lib/seller-analytics";

export type StockTab = "tumu" | "kritik" | "stokyok" | "dusuk-devir" | "hizli";
export const stockTabs: StockTab[] = ["tumu", "kritik", "stokyok", "dusuk-devir", "hizli"];

export function parseStockTab(value: string | null): StockTab {
  if (value === "stok-yok") return "stokyok";
  return stockTabs.find((tab) => tab === value) ?? "tumu";
}

export function matchesStockTab(row: StockRow, tab: StockTab): boolean {
  switch (tab) {
    case "tumu":
      return true;
    case "kritik":
      return row.status === "critical";
    case "stokyok":
      return row.status === "out";
    case "dusuk-devir":
      return row.slow;
    case "hizli":
      return row.fast;
  }
}

export function countStockTabs(rows: StockRow[]): Record<StockTab, number> {
  const result: Record<StockTab, number> = { tumu: rows.length, kritik: 0, stokyok: 0, "dusuk-devir": 0, hizli: 0 };
  for (const row of rows) {
    for (const tab of stockTabs) if (tab !== "tumu" && matchesStockTab(row, tab)) result[tab] += 1;
  }
  return result;
}

// ─── Kaydedilmemiş düzenlemeler ─────────────────────────────────────────────

/** Kullanıcının yazdığı ham metinler; tanımsız = o alan değiştirilmedi. */
export type StockDraft = { stock?: string; threshold?: string };
export type StockEdits = Record<string, StockDraft>;

export const MAX_STOCK = 1_000_000;

/** Boş olmayan, negatif olmayan tam sayı; aksi halde null. */
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= MAX_STOCK ? value : null;
}

export type ResolvedEdit = {
  stock: number;
  threshold: number;
  stockText: string;
  thresholdText: string;
  errors: { stock?: string; threshold?: string };
  changed: boolean;
  valid: boolean;
};

export function resolveEdit(row: StockRow, draft: StockDraft | undefined): ResolvedEdit {
  const stockText = draft?.stock ?? String(row.product.stock);
  const thresholdText = draft?.threshold ?? String(row.threshold);
  const stock = parseCount(stockText);
  const threshold = parseCount(thresholdText);
  const errors: ResolvedEdit["errors"] = {};
  if (stock === null) errors.stock = `Stok 0 ile ${MAX_STOCK.toLocaleString("tr-TR")} arasında bir tam sayı olmalı.`;
  if (threshold === null) errors.threshold = "Kritik seviye 0 veya daha büyük bir tam sayı olmalı.";
  const changed = (stock !== null && stock !== row.product.stock) || (threshold !== null && threshold !== row.threshold) || stock === null || threshold === null;
  return { stock: stock ?? row.product.stock, threshold: threshold ?? row.threshold, stockText, thresholdText, errors, changed: changed && (draft !== undefined), valid: !errors.stock && !errors.threshold };
}

export type StockFilters = {
  tab: StockTab;
  query: string;
  category: string;
  status: StockStatus | "";
  productState: "" | "aktif" | "pasif" | "taslak";
  changedOnly: boolean;
};

export const noStockFilters: StockFilters = { tab: "tumu", query: "", category: "", status: "", productState: "", changedOnly: false };

export function filterStockRows(rows: StockRow[], filters: StockFilters, edits: StockEdits): StockRow[] {
  const needle = filters.query.trim().toLocaleLowerCase("tr-TR");
  return rows.filter((row) => {
    if (!matchesStockTab(row, filters.tab)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.category && row.product.category !== filters.category) return false;
    if (filters.productState && (row.product.status ?? "aktif") !== filters.productState) return false;
    if (filters.changedOnly && !resolveEdit(row, edits[row.product.id]).changed) return false;
    if (needle) {
      const haystack = `${row.product.name} ${row.product.sku} ${row.product.category} ${row.product.brand ?? ""}`.toLocaleLowerCase("tr-TR");
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function activeStockFilterCount(filters: StockFilters): number {
  return [filters.status, filters.category, filters.productState, filters.changedOnly ? "1" : "", filters.query.trim()].filter(Boolean).length;
}

// ─── Toplu işlem ────────────────────────────────────────────────────────────

export type AdjustMode = "add" | "remove" | "set" | "threshold";

export const adjustLabels: Record<AdjustMode, string> = {
  add: "Stok Ekle (+)",
  remove: "Stok Düş (−)",
  set: "Yeni Değer Ata",
  threshold: "Kritik Seviye",
};

/** Bir ürüne toplu işlemi uygular; sonuç ham metin olarak taslağa yazılır. */
export function applyAdjust(row: StockRow, current: StockDraft | undefined, mode: AdjustMode, value: number): StockDraft {
  const base = resolveEdit(row, current);
  switch (mode) {
    case "add":
      return { ...current, stock: String(Math.min(MAX_STOCK, base.stock + value)) };
    case "remove":
      return { ...current, stock: String(Math.max(0, base.stock - value)) };
    case "set":
      return { ...current, stock: String(Math.min(MAX_STOCK, value)) };
    case "threshold":
      return { ...current, threshold: String(value) };
  }
}

export type StockChange = { product: SellerProduct; stock: number; threshold: number; previousStock: number };

export function movementReason(delta: number): string {
  return delta > 0 ? "Manuel Stok Girişi" : "Manuel Stok Düşümü";
}

export function toMovements(changes: StockChange[], at: string, makeId: () => string): StockMovement[] {
  return changes
    .filter((change) => change.stock !== change.previousStock)
    .map((change) => {
      const delta = change.stock - change.previousStock;
      return { id: `mv-${makeId()}`, productId: change.product.id, delta, reason: movementReason(delta), at };
    });
}

/** Tahmini tükenme günü sınıfı: renk tek başına anlam taşımaz, metin de gösterilir. */
export function daysTone(row: StockRow): "danger" | "success" | "neutral" {
  if (row.status === "out") return "danger";
  if (row.daysLeft === null) return "neutral";
  if (row.daysLeft <= 7) return "danger";
  if (row.daysLeft >= 21) return "success";
  return "neutral";
}
