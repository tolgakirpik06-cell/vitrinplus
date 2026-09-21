"use client";

/**
 * İade deposu — demo (localStorage) uygulaması.
 * Gerçek para iadesi yapılmaz; durum akışı ve kurallar Supabase modundaki ile aynı domain katmanından gelir.
 */
import { createLocalStore } from "@/lib/local-store";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import type { DemoOrder } from "@/lib/demo-marketplace";
import { MarketplaceError } from "@/lib/domain/errors";
import { RETURN_REASONS, RETURN_WINDOW_DAYS, assertReturnRequest, assertReturnTransition } from "@/lib/domain/returns";
import type { CreateReturnInput, ReturnEventView, ReturnableItemView, ReturnTransitionOptions, ReturnView, ReturnsRepository } from "@/lib/repositories/types";
import type { DbReturnReason, DbReturnStatus } from "@/types/database";

export type DemoReturnRecord = {
  id: string; returnNo: string; orderId: string; itemIndex: number; productSlug: string; productName: string;
  quantity: number; unitPrice: number; reason: DbReturnReason; description: string | null; status: DbReturnStatus;
  refundAmount: number; rejectionReason: string | null; carrier: string | null; trackingNo: string | null; restock: boolean;
  buyerId: string; sellerOwnerId: string | null; customerName: string; createdAt: string;
  approvedAt: string | null; shippedAt: string | null; receivedAt: string | null; refundedAt: string | null;
  events: ReturnEventView[];
};

type DemoReturnsState = { version: 1; items: DemoReturnRecord[] };
const initial: DemoReturnsState = { version: 1, items: [] };

function isRecord(value: unknown): value is DemoReturnRecord {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.orderId === "string" && typeof item.buyerId === "string" && typeof item.status === "string" && typeof item.quantity === "number" && Array.isArray(item.events);
}

export const demoReturnsStore = createLocalStore<DemoReturnsState>({
  key: STORAGE_KEYS.demoReturns,
  initial,
  parse(raw) {
    if (typeof raw !== "object" || raw === null) return initial;
    const record = raw as Record<string, unknown>;
    if (record.version !== 1 || !Array.isArray(record.items)) return initial;
    return { version: 1, items: record.items.filter(isRecord) };
  },
});

export type DemoReturnsContext = {
  userId: string | null;
  userName: string;
  getOrders: () => readonly DemoOrder[];
  /** İade "depoya geri" işaretliyse ve teslim alındıysa satıcı stoğunu artırmak için çağrılır. */
  onRestock?: (productSlug: string, quantity: number) => void;
  now?: () => Date;
};

const itemId = (orderId: string, index: number) => `${orderId}#${index}`;

function parseItemId(value: string): { orderId: string; index: number } | null {
  const at = value.lastIndexOf("#");
  if (at < 1) return null;
  const index = Number(value.slice(at + 1));
  return Number.isInteger(index) && index >= 0 ? { orderId: value.slice(0, at), index } : null;
}

function activeQuantity(records: readonly DemoReturnRecord[], orderId: string, index: number): number {
  return records.filter((r) => r.orderId === orderId && r.itemIndex === index && r.status !== "rejected").reduce((sum, r) => sum + r.quantity, 0);
}

function toView(record: DemoReturnRecord): ReturnView {
  return {
    id: record.id, returnNo: record.returnNo, orderId: record.orderId, orderNo: record.orderId, orderItemId: itemId(record.orderId, record.itemIndex),
    productName: record.productName, quantity: record.quantity, reason: record.reason, description: record.description, status: record.status,
    refundAmount: record.refundAmount, rejectionReason: record.rejectionReason, carrier: record.carrier, trackingNo: record.trackingNo, restock: record.restock,
    customerName: record.customerName, createdAt: record.createdAt, approvedAt: record.approvedAt, shippedAt: record.shippedAt, receivedAt: record.receivedAt, refundedAt: record.refundedAt,
    events: record.events,
  };
}

const byNewest = (a: DemoReturnRecord, b: DemoReturnRecord) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function createDemoReturnsRepository(ctx: DemoReturnsContext): ReturnsRepository {
  const now = () => (ctx.now ? ctx.now() : new Date());

  function requireUser(): string {
    if (!ctx.userId) throw new MarketplaceError("AUTH_REQUIRED", "Giriş yapmalısın.");
    return ctx.userId;
  }

  return {
    async listMine() {
      const userId = requireUser();
      return demoReturnsStore.getSnapshot().items.filter((r) => r.buyerId === userId).sort(byNewest).map(toView);
    },

    async listForStore() {
      const userId = requireUser();
      return demoReturnsStore.getSnapshot().items.filter((r) => r.sellerOwnerId === userId).sort(byNewest).map(toView);
    },

    async listReturnable() {
      const userId = requireUser();
      const records = demoReturnsStore.getSnapshot().items;
      const result: ReturnableItemView[] = [];
      for (const order of ctx.getOrders()) {
        if (order.buyerId !== userId || order.status !== "teslim-edildi") continue;
        const deliveredAt = order.deliveredAt ?? order.createdAt;
        const deadline = new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * 86_400_000);
        if (now().getTime() > deadline.getTime()) continue;
        order.items.forEach((item, index) => {
          const remaining = item.quantity - activeQuantity(records, order.id, index);
          if (remaining < 1) return;
          result.push({ orderItemId: itemId(order.id, index), orderId: order.id, orderNo: order.id, productName: item.name, variantLabel: item.variantLabel ?? null, quantity: item.quantity, remaining, unitPrice: item.price, deliveredAt, deadline: deadline.toISOString() });
        });
      }
      return result;
    },

    async create(input: CreateReturnInput) {
      const userId = requireUser();
      if (!RETURN_REASONS.includes(input.reason)) throw new MarketplaceError("INVALID_REASON", "İade nedenini seç.");
      const description = input.description?.trim() ?? "";
      if (description.length > 1000) throw new MarketplaceError("INVALID_DESCRIPTION", "Açıklama en fazla 1000 karakter olabilir.");
      const parsed = parseItemId(input.orderItemId);
      const order = parsed ? ctx.getOrders().find((o) => o.id === parsed.orderId) : undefined;
      const item = order && parsed ? order.items[parsed.index] : undefined;
      if (!order || !parsed || !item) throw new MarketplaceError("ITEM_NOT_FOUND", "Sipariş kalemi bulunamadı.");
      const records = demoReturnsStore.getSnapshot().items;
      const refundAmount = assertReturnRequest(
        userId,
        { orderStatus: order.status === "teslim-edildi" ? "delivered" : order.status, deliveredAt: order.status === "teslim-edildi" ? order.deliveredAt ?? order.createdAt : null, itemQuantity: item.quantity, alreadyRequested: activeQuantity(records, order.id, parsed.index), unitPrice: item.price, buyerId: order.buyerId },
        input.quantity,
        now(),
      );
      const stamp = now().toISOString();
      const record: DemoReturnRecord = {
        id: crypto.randomUUID(), returnNo: `IAD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, orderId: order.id, itemIndex: parsed.index,
        productSlug: item.slug, productName: item.name, quantity: input.quantity, unitPrice: item.price, reason: input.reason, description: description || null,
        status: "requested", refundAmount, rejectionReason: null, carrier: null, trackingNo: null, restock: false,
        buyerId: order.buyerId, sellerOwnerId: item.ownerId ?? null, customerName: ctx.userName || "Müşteri", createdAt: stamp,
        approvedAt: null, shippedAt: null, receivedAt: null, refundedAt: null,
        events: [{ id: crypto.randomUUID(), fromStatus: null, toStatus: "requested", actorRole: "buyer", note: description || null, createdAt: stamp }],
      };
      demoReturnsStore.update((state) => ({ ...state, items: [record, ...state.items].slice(0, 300) }));
    },

    async transition(returnId: string, to: DbReturnStatus, options: ReturnTransitionOptions = {}) {
      const userId = requireUser();
      const record = demoReturnsStore.getSnapshot().items.find((r) => r.id === returnId);
      if (!record) throw new MarketplaceError("RETURN_NOT_FOUND", "İade talebi bulunamadı.");
      const role = assertReturnTransition({ id: userId, role: null }, { buyerId: record.buyerId, sellerId: record.sellerOwnerId ?? "", status: record.status }, to, options.note);
      const stamp = now().toISOString();
      const restock = to === "received" ? options.restock === true : record.restock;
      const next: DemoReturnRecord = {
        ...record, status: to, restock,
        rejectionReason: to === "rejected" ? options.note?.trim() || null : record.rejectionReason,
        carrier: options.carrier?.trim() || record.carrier, trackingNo: options.tracking?.trim() || record.trackingNo,
        approvedAt: to === "approved" ? stamp : record.approvedAt, shippedAt: to === "shipped" ? stamp : record.shippedAt,
        receivedAt: to === "received" ? stamp : record.receivedAt, refundedAt: to === "refunded" ? stamp : record.refundedAt,
        events: [...record.events, { id: crypto.randomUUID(), fromStatus: record.status, toStatus: to, actorRole: role, note: options.note?.trim() || null, createdAt: stamp }],
      };
      demoReturnsStore.update((state) => ({ ...state, items: state.items.map((r) => (r.id === returnId ? next : r)) }));
      if (to === "received" && restock) ctx.onRestock?.(record.productSlug, record.quantity);
    },
  };
}
