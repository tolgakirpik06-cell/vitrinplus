"use client";

/**
 * Satıcı operasyon verisi (demo).
 *
 * Ana demo kaydı (`vitrinplus-demo-v1`: ürünler, siparişler, stok) DEĞİŞMEZ.
 * Bu store, onun yanında duran ve yalnızca satıcı paneline ait EK bilgileri
 * tutar: kargo etiketi/takip no, sipariş notları, stok hareket kayıtları,
 * paket seçimi, okunmuş bildirimler. Böylece mevcut veri modeli kırılmadan
 * panel zenginleştirilir; ileride bir backend bağlandığında bu alanlar
 * tabloya taşınabilir.
 */
import { createLocalStore } from "@/lib/local-store";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import { DEFAULT_PLAN_KEY, isPlanKey, type PlanKey } from "@/lib/plans";

export type OrderEventKey = "alindi" | "hazirlaniyor" | "etiket" | "kargoda" | "dagitimda" | "teslim-edildi" | "iptal-edildi";

export type OrderEvent = { key: OrderEventKey; at: string };

export type OrderCustomer = {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
};

export type OrderMeta = {
  carrier?: string;
  tracking?: string;
  labelCreated?: boolean;
  labelPrinted?: boolean;
  outForDelivery?: boolean;
  invoiceNo?: string;
  invoiceAt?: string;
  notes?: string;
  /** Müşteriye "gönderilen" demo mesajları (gerçek bildirim gitmez). */
  messages?: { text: string; at: string }[];
  paymentMethod?: string;
  customer?: OrderCustomer;
  events?: OrderEvent[];
  sample?: boolean;
};

export type StockMovement = {
  id: string;
  productId: string;
  /** Pozitif: giriş, negatif: çıkış. */
  delta: number;
  reason: string;
  at: string;
};

export type BillingPeriod = "monthly" | "yearly";

export type ShopOps = {
  planKey: PlanKey;
  billing: BillingPeriod;
  /** Ek ürün kapasitesi TALEBİ (fiyatlar belirlenmediği için satın alma değil, talep). */
  capacityRequest: string | null;
  /** Enterprise teklif talebi bırakıldı mı (demo; gerçek bir talep iletilmez). */
  enterpriseRequested: boolean;
  orderMeta: Record<string, OrderMeta>;
  stockMovements: StockMovement[];
  readNotifications: string[];
  sampleLoaded: boolean;
};

export type SellerOpsState = { version: 1; shops: Record<string, ShopOps> };

export const emptyShopOps: ShopOps = {
  planKey: DEFAULT_PLAN_KEY,
  billing: "monthly",
  capacityRequest: null,
  enterpriseRequested: false,
  orderMeta: {},
  stockMovements: [],
  readNotifications: [],
  sampleLoaded: false,
};

const initialState: SellerOpsState = { version: 1, shops: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeShopOps(raw: unknown): ShopOps {
  if (!isRecord(raw)) return emptyShopOps;
  return {
    planKey: isPlanKey(raw.planKey) ? raw.planKey : DEFAULT_PLAN_KEY,
    billing: raw.billing === "yearly" ? "yearly" : "monthly",
    capacityRequest: typeof raw.capacityRequest === "string" ? raw.capacityRequest : null,
    enterpriseRequested: raw.enterpriseRequested === true,
    orderMeta: isRecord(raw.orderMeta) ? (raw.orderMeta as Record<string, OrderMeta>) : {},
    stockMovements: Array.isArray(raw.stockMovements) ? (raw.stockMovements as StockMovement[]) : [],
    readNotifications: Array.isArray(raw.readNotifications) ? (raw.readNotifications.filter((id) => typeof id === "string") as string[]) : [],
    sampleLoaded: raw.sampleLoaded === true,
  };
}

function parseState(raw: unknown): SellerOpsState {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.shops)) return initialState;
  const shops: Record<string, ShopOps> = {};
  for (const [ownerId, value] of Object.entries(raw.shops)) shops[ownerId] = normalizeShopOps(value);
  return { version: 1, shops };
}

export const sellerOpsStore = createLocalStore<SellerOpsState>({
  key: STORAGE_KEYS.sellerOps,
  initial: initialState,
  parse: parseState,
});

export function getShopOps(state: SellerOpsState, ownerId: string | undefined): ShopOps {
  return (ownerId ? state.shops[ownerId] : undefined) ?? emptyShopOps;
}

/** Bir mağazanın operasyon verisini günceller (kota hatasında fırlatır). */
export function updateShopOps(ownerId: string, change: (ops: ShopOps) => ShopOps): void {
  sellerOpsStore.update((state) => ({
    ...state,
    shops: { ...state.shops, [ownerId]: change(state.shops[ownerId] ?? emptyShopOps) },
  }));
}

/** Başvuru sihirbazında seçilen paketi mağazanın başlangıç paketi yapar. */
export function setOwnerPlan(ownerId: string, planKey: PlanKey): void {
  try {
    updateShopOps(ownerId, (ops) => ({ ...ops, planKey }));
  } catch {
    // Paket tercihi kaydedilemezse varsayılan paket kullanılır; başvuru akışı durmaz.
  }
}

// ─── Saf yardımcılar (ShopOps -> ShopOps) ────────────────────────────────────

export function withOrderMeta(ops: ShopOps, orderId: string, patch: Partial<OrderMeta>): ShopOps {
  return { ...ops, orderMeta: { ...ops.orderMeta, [orderId]: { ...ops.orderMeta[orderId], ...patch } } };
}

export function withOrderEvent(ops: ShopOps, orderId: string, key: OrderEventKey, at: string): ShopOps {
  const meta = ops.orderMeta[orderId] ?? {};
  const events = meta.events ?? [];
  if (events.some((event) => event.key === key)) return ops;
  return withOrderMeta(ops, orderId, { events: [...events, { key, at }] });
}

export function withStockMovements(ops: ShopOps, movements: StockMovement[]): ShopOps {
  if (!movements.length) return ops;
  // Kayıt şişmesin: son 500 hareket saklanır.
  return { ...ops, stockMovements: [...movements, ...ops.stockMovements].slice(0, 500) };
}

export function withReadNotifications(ops: ShopOps, ids: string[]): ShopOps {
  const merged = Array.from(new Set([...ops.readNotifications, ...ids]));
  return { ...ops, readNotifications: merged.slice(-300) };
}
