import type { AppRole } from "@/lib/auth/paths";
import type { DemoOrderStatus } from "@/lib/demo-marketplace";
import type { DbOrderStatus } from "@/types/database";
import { MarketplaceError } from "./errors";
import { round2 } from "./money";

/**
 * Sipariş durum makinesi ve yetki kuralları.
 * KAYNAK DOĞRULUK: supabase/migrations/0004_functions.sql → order_transition_allowed / transition_order.
 * Bu dosya onun birebir aynasıdır; scripts/domain.test.mjs iki tarafı karşılaştırır.
 */
export const ORDER_STATUSES: readonly DbOrderStatus[] = ["new", "preparing", "ready_to_ship", "shipped", "delivered", "cancelled"];

export const ORDER_TRANSITIONS: Record<DbOrderStatus, readonly DbOrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready_to_ship", "shipped", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOrderTransitionAllowed(from: DbOrderStatus, to: DbOrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const orderStatusLabels: Record<DbOrderStatus, string> = {
  new: "Yeni",
  preparing: "Hazırlanıyor",
  ready_to_ship: "Kargoya Hazır",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

export type OrderActor = { id: string | null; role: AppRole | null };
export type OrderParties = { buyerId: string; sellerId: string; status: DbOrderStatus };
export type OrderActorRole = "admin" | "seller" | "buyer";

/** Kullanıcının bu siparişteki rolü; siparişle ilgisi yoksa null (varlığı sızdırılmaz). */
export function orderRoleOf(actor: OrderActor, order: OrderParties): OrderActorRole | null {
  if (!actor.id) return null;
  if (actor.role === "admin") return "admin";
  if (order.sellerId === actor.id) return "seller";
  if (order.buyerId === actor.id) return "buyer";
  return null;
}

/** Müşteri yalnızca kendi siparişini, satıcı yalnızca kendi mağazasının siparişini görür. */
export function canViewOrder(actor: OrderActor, order: OrderParties): boolean {
  return orderRoleOf(actor, order) !== null;
}

/**
 * Durum geçişi yetkisi (SQL transition_order ile aynı sıra):
 *  1) giriş yok → AUTH_REQUIRED, 2) siparişle ilgisiz → ORDER_NOT_FOUND, 3) geçersiz geçiş → INVALID_TRANSITION,
 *  4) iptal dışındaki geçişleri müşteri yapamaz → FORBIDDEN.
 */
export function checkOrderTransition(actor: OrderActor, order: OrderParties, to: DbOrderStatus): { ok: true; role: OrderActorRole } | { ok: false; code: "AUTH_REQUIRED" | "ORDER_NOT_FOUND" | "INVALID_TRANSITION" | "FORBIDDEN" } {
  if (!actor.id) return { ok: false, code: "AUTH_REQUIRED" };
  const role = orderRoleOf(actor, order);
  if (!role) return { ok: false, code: "ORDER_NOT_FOUND" };
  if (!isOrderTransitionAllowed(order.status, to)) return { ok: false, code: "INVALID_TRANSITION" };
  if (to !== "cancelled" && role === "buyer") return { ok: false, code: "FORBIDDEN" };
  return { ok: true, role };
}

const TRANSITION_MESSAGES = {
  AUTH_REQUIRED: "Giriş yapmalısın.",
  ORDER_NOT_FOUND: "Sipariş bulunamadı.",
  INVALID_TRANSITION: "Bu durum değişikliği yapılamaz.",
  FORBIDDEN: "Bu siparişi güncelleme yetkin yok.",
} as const;

export function assertOrderTransition(actor: OrderActor, order: OrderParties, to: DbOrderStatus): OrderActorRole {
  const result = checkOrderTransition(actor, order, to);
  if (!result.ok) throw new MarketplaceError(result.code, TRANSITION_MESSAGES[result.code]);
  return result.role;
}

// ─── Sepet satırı doğrulama ─────────────────────────────────────────────────

export type OrderLineInput = { productId: string; variantId?: string | null; variantLabel?: string | null; quantity: number };

export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

/** Negatif, sıfır, kesirli, NaN veya 99'dan büyük adet reddedilir; sepet boş olamaz. */
export function validateOrderLines(lines: readonly OrderLineInput[]): void {
  if (lines.length === 0) throw new MarketplaceError("EMPTY_CART", "Sepetin boş.");
  if (lines.length > MAX_ORDER_LINES) throw new MarketplaceError("TOO_MANY_LINES", `Sepette en fazla ${MAX_ORDER_LINES} satır olabilir.`);
  for (const line of lines) {
    if (!line.productId) throw new MarketplaceError("INVALID_LINE", "Ürün kimliği eksik.");
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) throw new MarketplaceError("INVALID_QUANTITY", "Ürün adedi geçersiz.");
  }
}

export type PurchasableProduct = { sellerId: string; status: "draft" | "active" | "passive"; deletedAt: string | null; stock: number };

/** Sipariş verilebilir mi? (SQL place_order kontrollerinin aynası; ilk uygunsuzluğun kodunu döndürür.) */
export function checkPurchase(input: { buyerId: string | null; product: PurchasableProduct; storeActive: boolean; quantity: number }): { ok: true } | { ok: false; code: "AUTH_REQUIRED" | "INVALID_QUANTITY" | "NOT_SELLABLE" | "STORE_INACTIVE" | "OWN_PRODUCT" | "OUT_OF_STOCK" } {
  if (!input.buyerId) return { ok: false, code: "AUTH_REQUIRED" };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_LINE_QUANTITY) return { ok: false, code: "INVALID_QUANTITY" };
  const { product } = input;
  if (product.deletedAt !== null || product.status !== "active") return { ok: false, code: "NOT_SELLABLE" };
  if (!input.storeActive) return { ok: false, code: "STORE_INACTIVE" };
  if (product.sellerId === input.buyerId) return { ok: false, code: "OWN_PRODUCT" };
  if (input.quantity > product.stock) return { ok: false, code: "OUT_OF_STOCK" };
  return { ok: true };
}

// ─── Fiyatlandırma (SQL place_order aynası) ─────────────────────────────────

export const COUPON_CODE = "VITRINPLUS10";
export const COUPON_RATE = 0.1;
export const EXPRESS_SHIPPING_FEE = 29.9;

export type StoreShipping = { shippingFee: number; freeShippingThreshold: number };

export type OrderQuote = { subtotal: number; discount: number; shipping: number; total: number };

/** Mağaza başına sipariş toplamı. Kupon platform kuponudur (satıcı hakedişinden düşülmez). */
export function quoteStoreOrder(subtotal: number, shipping: StoreShipping, options: { coupon?: string | null; express?: boolean } = {}): OrderQuote {
  const discount = options.coupon && options.coupon.trim().toUpperCase() === COUPON_CODE ? round2(subtotal * COUPON_RATE) : 0;
  const base = subtotal - discount >= shipping.freeShippingThreshold ? 0 : shipping.shippingFee;
  const shippingTotal = round2(base + (options.express ? EXPRESS_SHIPPING_FEE : 0));
  return { subtotal: round2(subtotal), discount, shipping: shippingTotal, total: round2(subtotal - discount + shippingTotal) };
}

// ─── İptal: stok yalnızca BİR kez geri yüklenir ─────────────────────────────

export type CancellableOrder = { status: DbOrderStatus; stockRestoredAt: string | null };

/** İptal sonucu: stok geri yüklenmeli mi? İkinci iptal denemesi geçersiz geçiştir; stok iki kez iade edilemez. */
export function planCancellation(order: CancellableOrder, now: Date = new Date()): { restoreStock: boolean; stockRestoredAt: string } {
  if (!isOrderTransitionAllowed(order.status, "cancelled")) throw new MarketplaceError("INVALID_TRANSITION", "Bu durum değişikliği yapılamaz.");
  return { restoreStock: order.stockRestoredAt === null, stockRestoredAt: order.stockRestoredAt ?? now.toISOString() };
}

/** Tekrarlanan sipariş isteği (aynı idempotency anahtarı) yeni sipariş oluşturmaz. */
export function isDuplicateCheckout(existingKeys: ReadonlySet<string>, key: string): boolean {
  return existingKeys.has(key);
}

// ─── Arayüz (Aşama 1 demo) durum adlarıyla eşleme ───────────────────────────


/** Aşama 1 arayüzü 5 durum kullanır; "Kargoya Hazır" arayüzde etiket bilgisinden türetilir (bkz. lib/seller-analytics orderUiStatus). */
export const dbToDemoStatus: Record<DbOrderStatus, DemoOrderStatus> = {
  new: "alindi",
  preparing: "hazirlaniyor",
  ready_to_ship: "hazirlaniyor",
  shipped: "kargoda",
  delivered: "teslim-edildi",
  cancelled: "iptal-edildi",
};

export const demoToDbStatus: Record<DemoOrderStatus, DbOrderStatus> = {
  alindi: "new",
  hazirlaniyor: "preparing",
  kargoda: "shipped",
  "teslim-edildi": "delivered",
  "iptal-edildi": "cancelled",
};
