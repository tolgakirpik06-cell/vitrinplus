/**
 * Sipariş ekranı için SAF yardımcılar: filtreleme, kargo listesi, demo takip/fatura numarası.
 * React'e bağımlı değildir.
 */
import { dayKey, startOfDay } from "@/lib/format";
import { hasAddressProblem, hasStockIssue, isLateOrder, type OrderUiStatus, type SellerOrderRow, type StockRow } from "@/lib/seller-analytics";

export const CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "Trendyol Express", "Demo Kargo"] as const;

export type OrderStatusFilter = OrderUiStatus | "bekleyen" | "";
export type OrderAlertFilter = "" | "adres" | "geciken" | "stok" | "hepsi";
export type OrderDateFilter = "" | "bugun" | "7g" | "30g";

export type OrderFilters = {
  status: OrderStatusFilter;
  alert: OrderAlertFilter;
  query: string;
  date: OrderDateFilter;
  carrier: string;
  payment: string;
};

export const noOrderFilters: OrderFilters = { status: "", alert: "", query: "", date: "", carrier: "", payment: "" };

export const orderStatusFilters: OrderUiStatus[] = ["yeni", "hazirlaniyor", "kargoya-hazir", "kargoda", "teslim-edildi", "iptal"];

export function parseStatusFilter(value: string | null): OrderStatusFilter {
  if (value === "bekleyen") return "bekleyen";
  return orderStatusFilters.find((status) => status === value) ?? "";
}

export function parseAlertFilter(value: string | null): OrderAlertFilter {
  if (value === "adres" || value === "geciken" || value === "stok" || value === "hepsi") return value;
  return "";
}

const WAITING: OrderUiStatus[] = ["yeni", "hazirlaniyor", "kargoya-hazir"];

export function isWaiting(row: SellerOrderRow): boolean {
  return WAITING.includes(row.ui);
}

function turkishLower(value: string): string {
  return value.toLocaleLowerCase("tr-TR");
}

export function matchesAlert(row: SellerOrderRow, alert: OrderAlertFilter, ctx: { now: Date; preparationDays: number; stockRows: StockRow[] }): boolean {
  switch (alert) {
    case "":
      return true;
    case "adres":
      return hasAddressProblem(row);
    case "geciken":
      return isLateOrder(row, ctx.now, ctx.preparationDays);
    case "stok":
      return hasStockIssue(row, ctx.stockRows);
    case "hepsi":
      return hasAddressProblem(row) || isLateOrder(row, ctx.now, ctx.preparationDays) || hasStockIssue(row, ctx.stockRows);
  }
}

export function matchesDate(row: SellerOrderRow, date: OrderDateFilter, now: Date): boolean {
  if (!date) return true;
  if (date === "bugun") return dayKey(row.createdAt) === dayKey(now);
  const days = date === "7g" ? 7 : 30;
  return row.createdAt.getTime() >= startOfDay(now).getTime() - (days - 1) * 86_400_000;
}

export function filterOrders(rows: SellerOrderRow[], filters: OrderFilters, ctx: { now: Date; preparationDays: number; stockRows: StockRow[] }): SellerOrderRow[] {
  const needle = turkishLower(filters.query.trim());
  return rows.filter((row) => {
    if (filters.status === "bekleyen" ? !isWaiting(row) : filters.status && row.ui !== filters.status) return false;
    if (filters.carrier && row.carrier !== filters.carrier) return false;
    if (filters.payment && row.paymentMethod !== filters.payment) return false;
    if (!matchesDate(row, filters.date, ctx.now)) return false;
    if (!matchesAlert(row, filters.alert, ctx)) return false;
    if (needle) {
      const haystack = turkishLower([row.order.id, row.customer.name, row.customer.city ?? "", ...row.items.map((item) => item.name)].join(" "));
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function activeFilterCount(filters: OrderFilters): number {
  return [filters.status, filters.alert, filters.query.trim(), filters.date, filters.carrier, filters.payment].filter(Boolean).length;
}

/** Demo takip numarası: sipariş numarasından türetilir, gerçek kargo servisine bağlı değildir. */
export function demoTrackingNo(orderId: string): string {
  let hash = 7;
  for (let index = 0; index < orderId.length; index += 1) hash = (hash * 31 + orderId.charCodeAt(index)) % 1_000_000_007;
  return `DT${String(hash).padStart(10, "0")}`;
}

/** Demo fatura numarası. */
export function demoInvoiceNo(orderId: string, at: Date): string {
  return `VPF-${at.getFullYear()}-${orderId.replace(/^VP-/, "")}`;
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr-TR"));
}
