/**
 * Veritabanı satırı → arayüz modeli dönüşümleri (saf fonksiyonlar; ağ yok).
 * Aşama 1 arayüzü DemoShop / SellerProduct / DemoOrder şekillerini kullandığı için Supabase verisi bu şekillere çevrilir.
 */
import type { DemoOrder, DemoShop, SellerCampaign, SellerProduct } from "@/lib/demo-marketplace";
import type { OrderEvent, OrderEventKey, OrderMeta } from "@/lib/seller-ops";
import { statusFromDb } from "@/lib/domain/product";
import { dbToDemoStatus } from "@/lib/domain/order-engine";
import { round2 } from "@/lib/domain/money";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/domain/account";
import type { Product } from "@/types";
import type {
  AddressRow, DbOrderStatus, DbSellerStatus, LedgerDeduction, OrderEventRow, OrderItemRow, OrderRow, OrderShipmentRow, ProductCostRow, ProductImageRow, ProductRow,
  ProductVariantRow, ProfileRow, ReturnEventRow, ReturnRow, SellerLedgerRow, SellerPayoutRow, StockMovementRow, StoreCampaignRow, StoreRow,
} from "@/types/database";
import type { AddressView, LedgerEntryView, PayoutView, ProfileView, ReturnEventView, ReturnView, StockMovementView } from "@/lib/repositories/types";
import { num } from "./common";

export function mapProfile(row: ProfileRow): ProfileView {
  return {
    id: row.id,
    email: row.email ?? "",
    fullName: row.full_name,
    phone: row.phone ?? "",
    avatarUrl: row.avatar_url,
    role: row.role,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...row.notification_prefs },
  };
}

export function mapAddress(row: AddressRow): AddressView {
  return { id: row.id, title: row.title, fullName: row.full_name, phone: row.phone, city: row.city, district: row.district, addressLine: row.address_line, postalCode: row.postal_code ?? "", isDefault: row.is_default };
}

// ─── Mağaza / ürün ──────────────────────────────────────────────────────────

/** ISO zaman → yerel gün (YYYY-MM-DD); arayüzdeki tarih alanları gün bazlıdır. */
export function toDayInput(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function productSlugFor(id: string): string {
  return `demo-${id}`;
}

export function idFromProductSlug(slug: string): string | null {
  if (!slug.startsWith("demo-")) return null;
  const id = slug.slice(5);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export function mapSellerProduct(row: ProductRow, cost: ProductCostRow | undefined, images: readonly ProductImageRow[], variants: readonly ProductVariantRow[]): SellerProduct {
  const costs = cost ? { shipping: num(cost.shipping_cost), packaging: num(cost.packaging_cost), payment: num(cost.payment_cost), other: num(cost.other_cost) } : undefined;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    category: row.category,
    price: num(row.price),
    cost: cost ? num(cost.cost) : 0,
    stock: row.stock,
    status: statusFromDb[row.status],
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    barcode: row.barcode ?? undefined,
    shortDescription: row.short_description || undefined,
    description: row.description || undefined,
    images: [...images].sort((a, b) => a.sort_order - b.sort_order).map((image) => image.url),
    costs,
    salePrice: row.discount_price === null ? undefined : num(row.discount_price),
    saleStart: toDayInput(row.discount_start),
    saleEnd: toDayInput(row.discount_end),
    criticalThreshold: row.low_stock_threshold,
    autoPassive: row.auto_passive,
    variants: variants.filter((variant) => variant.is_active).sort((a, b) => a.sort_order - b.sort_order).map((variant) => ({ id: variant.id, label: variant.label, sku: variant.sku ?? undefined, stock: variant.stock })),
    createdAt: row.created_at,
  };
}

export function mapCampaign(row: StoreCampaignRow): SellerCampaign {
  return { id: row.id, name: row.name, discountPercent: row.discount_percent, endDate: row.end_date };
}

export function sellerStatusToShopStatus(status: DbSellerStatus): DemoShop["status"] {
  if (status === "approved") return "onaylandi";
  if (status === "pending") return "bekliyor";
  return "reddedildi";
}

export function mapShop(input: { ownerId: string; reference: string; status: DbSellerStatus; store: StoreRow; products: SellerProduct[]; campaigns: SellerCampaign[] }): DemoShop {
  const { store } = input;
  return {
    ownerId: input.ownerId,
    reference: input.reference,
    status: sellerStatusToShopStatus(input.status),
    products: input.products,
    campaigns: input.campaigns,
    settings: { storeName: store.name, description: store.description, contactEmail: store.contact_email, contactPhone: store.contact_phone },
    shipping: { shippingFee: num(store.shipping_fee), freeShippingThreshold: num(store.free_shipping_threshold), preparationDays: store.preparation_days, carrier: store.carrier },
  };
}

// ─── Müşteriye açık ürün (maliyet YOK) ──────────────────────────────────────

export function mapPublicProduct(publicProduct: { id: string; name: string; sku: string | null; brand: string | null; model: string | null; category: string; shortDescription: string; description: string; price: number; oldPrice: number | null; stock: number; images: string[]; variantOptions?: { label: string; stock: number }[] }, store: { name: string; description: string; shippingFee?: number; freeShippingThreshold?: number }): Product {
  const specifications = [{ label: "SKU", value: publicProduct.sku ?? "—" }, ...(publicProduct.brand ? [{ label: "Marka", value: publicProduct.brand }] : []), ...(publicProduct.model ? [{ label: "Model", value: publicProduct.model }] : [])];
  return {
    id: publicProduct.id,
    slug: productSlugFor(publicProduct.id),
    name: publicProduct.name,
    brand: publicProduct.brand?.trim() || store.name,
    category: publicProduct.category,
    price: publicProduct.price,
    ...(publicProduct.oldPrice ? { oldPrice: publicProduct.oldPrice, discount: Math.round((1 - publicProduct.price / publicProduct.oldPrice) * 100) } : {}),
    rating: 0,
    reviewCount: 0,
    seller: store.name,
    stock: publicProduct.stock,
    shipping: { label: "Standart teslimat", variant: "standard" },
    aiTag: { type: "smart", label: "Mağaza ürünü" },
    visual: "generic",
    icon: "shopping-bag",
    images: [],
    imageUrls: publicProduct.images,
    ...(store.shippingFee !== undefined && store.freeShippingThreshold !== undefined ? { storeInfo: { shippingFee: store.shippingFee, freeShippingThreshold: store.freeShippingThreshold } } : {}),
    ...(publicProduct.variantOptions?.length ? { variantOptions: publicProduct.variantOptions } : {}),
    description: publicProduct.description.trim() || publicProduct.shortDescription.trim() || store.description || "Satıcı tarafından eklenen ürün.",
    specifications,
    tags: ["yeni-gelenler"],
  };
}

// ─── Siparişler ─────────────────────────────────────────────────────────────

/** Sipariş numarası (VP-XXXXXXXX) arayüzde sipariş kimliği olarak kullanılır; veritabanı uuid'i ayrıca tutulur. */
export function mapOrder(order: OrderRow, items: readonly OrderItemRow[], storeName: string): DemoOrder {
  return {
    id: order.order_no,
    buyerId: order.buyer_id,
    createdAt: order.created_at,
    status: dbToDemoStatus[order.status],
    ...(order.delivered_at ? { deliveredAt: order.delivered_at } : {}),
    items: items.map((item) => ({
      slug: item.product_id ? productSlugFor(item.product_id) : `removed-${item.id}`,
      name: item.product_name,
      seller: storeName,
      ownerId: item.seller_id,
      quantity: item.quantity,
      price: num(item.unit_price),
      ...(item.variant_label ? { variantLabel: item.variant_label } : {}),
    })),
    address: order.shipping_address,
    billingAddress: order.billing_address,
    subtotal: num(order.subtotal),
    discount: num(order.discount_total),
    shipping: num(order.shipping_total),
    total: num(order.total),
  };
}

const eventKeyFor: Record<DbOrderStatus, OrderEventKey> = { new: "alindi", preparing: "hazirlaniyor", ready_to_ship: "etiket", shipped: "kargoda", delivered: "teslim-edildi", cancelled: "iptal-edildi" };

/** Gerçek sipariş kayıtlarından zaman çizelgesi ve kargo bilgisi (yerel demo meta'sının yerini alır). */
export function orderMetaFromServer(order: OrderRow, shipment: OrderShipmentRow | undefined, events: readonly OrderEventRow[]): OrderMeta {
  const late = order.status === "ready_to_ship" || order.status === "shipped" || order.status === "delivered";
  const mapped: OrderEvent[] = [];
  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = eventKeyFor[event.to_status];
    if (!mapped.some((item) => item.key === key)) mapped.push({ key, at: event.created_at });
  }
  return {
    carrier: shipment?.carrier ?? undefined,
    tracking: shipment?.tracking_no ?? undefined,
    labelCreated: late || undefined,
    labelPrinted: late || undefined,
    notes: order.seller_note ?? undefined,
    customer: { name: order.ship_to.name, phone: order.ship_to.phone, city: order.ship_to.city },
    events: mapped,
  };
}

// ─── İade / defter / ödeme / stok ───────────────────────────────────────────

export function mapReturnEvent(row: ReturnEventRow): ReturnEventView {
  return { id: row.id, fromStatus: row.from_status, toStatus: row.to_status, actorRole: row.actor_role, note: row.note, createdAt: row.created_at };
}

export type ReturnJoin = ReturnRow & { orders?: { order_no: string; ship_to: { name?: string } | null } | null };

export function mapReturn(row: ReturnJoin, events: readonly ReturnEventRow[]): ReturnView {
  return {
    id: row.id,
    returnNo: row.return_no,
    orderId: row.order_id,
    orderNo: row.orders?.order_no ?? "",
    orderItemId: row.order_item_id,
    productName: row.product_name,
    quantity: row.quantity,
    reason: row.reason,
    description: row.description,
    status: row.status,
    refundAmount: num(row.refund_amount),
    rejectionReason: row.rejection_reason,
    carrier: row.carrier,
    trackingNo: row.tracking_no,
    restock: row.restock,
    customerName: row.orders?.ship_to?.name ?? "Müşteri",
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    shippedAt: row.shipped_at,
    receivedAt: row.received_at,
    refundedAt: row.refunded_at,
    events: events.filter((event) => event.return_id === row.id).map(mapReturnEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export function parseDeductions(value: unknown): LedgerDeduction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({ type: String(item.type ?? ""), label: String(item.label ?? ""), rate: num(item.rate), amount: num(item.amount) }));
}

export function mapLedger(row: SellerLedgerRow, orderNo: string | null): LedgerEntryView {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo,
    returnId: row.return_id,
    entryType: row.entry_type,
    status: row.status,
    gross: num(row.gross_amount),
    discount: num(row.discount_amount),
    shipping: num(row.shipping_amount),
    deductions: parseDeductions(row.deductions),
    deductionTotal: num(row.deduction_total),
    net: round2(num(row.net_amount)),
    availableAt: row.available_at,
    payoutId: row.payout_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function mapPayout(row: SellerPayoutRow, storeName: string): PayoutView {
  return {
    id: row.id,
    payoutNo: row.payout_no,
    storeId: row.store_id,
    storeName,
    amount: num(row.amount),
    status: row.status,
    plannedFor: row.planned_for,
    paidAt: row.paid_at,
    provider: row.provider,
    providerReference: row.provider_reference,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function mapMovement(row: StockMovementRow): StockMovementView {
  return {
    id: row.id, productId: row.product_id, variantId: row.variant_id, productName: row.product_name, type: row.movement_type, change: row.quantity_change,
    before: row.stock_before, after: row.stock_after, referenceType: row.reference_type, note: row.note, createdAt: row.created_at,
  };
}

