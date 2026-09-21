/** Sipariş oluşturma, listeleme ve durum geçişleri. Fiyat / stok / yetki kararları veritabanı fonksiyonlarındadır. */
import type { DemoOrder } from "@/lib/demo-marketplace";
import { MarketplaceError } from "@/lib/domain/errors";
import { validateOrderLines, type OrderLineInput } from "@/lib/domain/order-engine";
import type { OrderMeta } from "@/lib/seller-ops";
import type { DbOrderStatus, OrderEventRow, OrderItemRow, OrderRow, OrderShipmentRow, ShipTo } from "@/types/database";
import { callRpc, num, rows, unwrap, type Client } from "./common";
import { mapOrder, orderMetaFromServer } from "./mappers";

export type PlaceOrderDetails = { shipTo: ShipTo; billingAddress: string; coupon: string | null; express: boolean; note?: string };
export type PlacedOrder = { id: string; orderNo: string; storeId: string; status: DbOrderStatus; subtotal: number; discountTotal: number; shippingTotal: number; total: number };
export type PlaceOrderResult = { duplicate: boolean; orders: PlacedOrder[] };

function parsePlaced(value: unknown): PlaceOrderResult {
  const record = (typeof value === "object" && value !== null ? value : {}) as { duplicate?: unknown; orders?: unknown };
  const list = Array.isArray(record.orders) ? record.orders : [];
  return {
    duplicate: record.duplicate === true,
    orders: list.map((item) => {
      const order = item as Record<string, unknown>;
      return { id: String(order.id), orderNo: String(order.order_no), storeId: String(order.store_id), status: order.status as DbOrderStatus, subtotal: num(order.subtotal), discountTotal: num(order.discount_total), shippingTotal: num(order.shipping_total), total: num(order.total) };
    }),
  };
}

/**
 * Sepeti siparişe çevirir. Aynı `idempotencyKey` ikinci kez gönderilirse yeni sipariş OLUŞMAZ (çift tıklama / yeniden deneme güvenli).
 * Fiyat, stok, indirim tarihi ve mağaza durumu sunucuda doğrulanır; istemcinin gönderdiği fiyata güvenilmez.
 */
export async function placeOrder(client: Client, lines: readonly OrderLineInput[], details: PlaceOrderDetails, idempotencyKey: string): Promise<PlaceOrderResult> {
  validateOrderLines(lines);
  if (idempotencyKey.length < 8) throw new MarketplaceError("INVALID_KEY", "Sipariş anahtarı geçersiz.");
  const data = await callRpc(client, "place_order", {
    p_items: lines.map((line) => ({ product_id: line.productId, variant_id: line.variantId ?? null, variant_label: line.variantLabel ?? null, quantity: line.quantity })),
    p_details: { ship_to: details.shipTo, billing_address: details.billingAddress, coupon: details.coupon, express: details.express, note: details.note ?? "" },
    p_idempotency_key: idempotencyKey,
  });
  return parsePlaced(data);
}

export type OrderBundle = {
  orders: DemoOrder[];
  /** Sipariş numarası → sunucu uuid'i (durum geçişi çağrıları için). */
  idByNo: Record<string, string>;
  /** Sipariş numarası → gerçek olay / kargo verisinden türetilen meta. */
  metaByNo: Record<string, OrderMeta>;
};

type OrderJoin = OrderRow & { order_items: OrderItemRow[] | null; stores: { name: string } | { name: string }[] | null; order_shipments: OrderShipmentRow | OrderShipmentRow[] | null; order_events: OrderEventRow[] | null };

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function bundle(data: unknown): OrderBundle {
  const result: OrderBundle = { orders: [], idByNo: {}, metaByNo: {} };
  for (const row of rows<OrderJoin>(data)) {
    const storeName = one(row.stores)?.name ?? "Mağaza";
    result.orders.push(mapOrder(row, row.order_items ?? [], storeName));
    result.idByNo[row.order_no] = row.id;
    result.metaByNo[row.order_no] = orderMetaFromServer(row, one(row.order_shipments), row.order_events ?? []);
  }
  return result;
}

const SELECT = "*, order_items(*), stores(name), order_shipments(*), order_events(*)";
/** Liste sorguları son 200 sipariş ile sınırlıdır; daha eskisi "daha fazla yükle" ile sayfalanır. */
export const ORDER_PAGE_SIZE = 200;

export async function loadBuyerOrders(client: Client, userId: string, page = 0): Promise<OrderBundle> {
  return bundle(unwrap(await client.from("orders").select(SELECT).eq("buyer_id", userId).order("created_at", { ascending: false }).range(page * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE + ORDER_PAGE_SIZE - 1)));
}

export async function loadStoreOrders(client: Client, storeId: string, page = 0): Promise<OrderBundle> {
  return bundle(unwrap(await client.from("orders").select(SELECT).eq("store_id", storeId).order("created_at", { ascending: false }).range(page * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE + ORDER_PAGE_SIZE - 1)));
}

export function mergeBundles(...bundles: OrderBundle[]): OrderBundle {
  const seen = new Set<string>();
  const merged: OrderBundle = { orders: [], idByNo: {}, metaByNo: {} };
  for (const item of bundles) {
    for (const order of item.orders) {
      if (seen.has(order.id)) continue;
      seen.add(order.id);
      merged.orders.push(order);
    }
    Object.assign(merged.idByNo, item.idByNo);
    Object.assign(merged.metaByNo, item.metaByNo);
  }
  merged.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return merged;
}

export async function transitionOrder(client: Client, orderId: string, to: DbOrderStatus, options: { note?: string; carrier?: string; tracking?: string } = {}): Promise<void> {
  await callRpc(client, "transition_order", { p_order_id: orderId, p_to: to, p_note: options.note ?? null, p_carrier: options.carrier ?? null, p_tracking: options.tracking ?? null });
}

export async function updateOrderDetails(client: Client, orderId: string, details: { carrier?: string; tracking?: string; note?: string }): Promise<void> {
  await callRpc(client, "update_order_details", { p_order_id: orderId, p_carrier: details.carrier ?? null, p_tracking: details.tracking ?? null, p_note: details.note ?? null });
}
