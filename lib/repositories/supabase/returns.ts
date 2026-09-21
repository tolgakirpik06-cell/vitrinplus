import { RETURN_WINDOW_DAYS } from "@/lib/domain/returns";
import type { CreateReturnInput, ReturnableItemView, ReturnsRepository, ReturnTransitionOptions } from "@/lib/repositories/types";
import type { DbReturnStatus, OrderItemRow, ReturnEventRow } from "@/types/database";
import { callRpc, chunk, fetchAll, num, rows, unwrap, type Client } from "./common";
import { mapReturn, type ReturnJoin } from "./mappers";

export type ReturnsContext = { userId: string; storeId: string | null };

const SELECT = "*, orders(order_no, ship_to)";

async function withEvents(client: Client, list: ReturnJoin[]) {
  const events: ReturnEventRow[] = [];
  for (const ids of chunk(list.map((item) => item.id), 100)) events.push(...rows<ReturnEventRow>(unwrap(await client.from("return_events").select("*").in("return_id", ids))));
  return list.map((item) => mapReturn(item, events));
}

type ReturnableJoin = Pick<OrderItemRow, "id" | "order_id" | "product_name" | "variant_label" | "quantity" | "unit_price"> & { orders: { order_no: string; status: string; delivered_at: string | null } | { order_no: string; status: string; delivered_at: string | null }[] | null };

export function createReturnsRepository(client: Client, ctx: ReturnsContext): ReturnsRepository {
  async function listMine() {
    const data = rows<ReturnJoin>(unwrap(await client.from("returns").select(SELECT).eq("buyer_id", ctx.userId).order("created_at", { ascending: false }).limit(200)));
    return withEvents(client, data);
  }

  async function listReturnable(): Promise<ReturnableItemView[]> {
    const items = await fetchAll<ReturnableJoin>((from, to) =>
      client.from("order_items").select("id, order_id, product_name, variant_label, quantity, unit_price, orders!inner(order_no, status, delivered_at, buyer_id)").eq("orders.buyer_id", ctx.userId).eq("orders.status", "delivered").range(from, to)
    );
    const requested = rows<{ order_item_id: string; quantity: number; status: DbReturnStatus }>(unwrap(await client.from("returns").select("order_item_id, quantity, status").eq("buyer_id", ctx.userId)));
    const now = Date.now();
    const result: ReturnableItemView[] = [];
    for (const item of items) {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      if (!order?.delivered_at) continue;
      const deadline = new Date(order.delivered_at).getTime() + RETURN_WINDOW_DAYS * 86_400_000;
      const already = requested.filter((entry) => entry.order_item_id === item.id && entry.status !== "rejected").reduce((total, entry) => total + entry.quantity, 0);
      const remaining = item.quantity - already;
      if (remaining < 1 || now > deadline) continue;
      result.push({ orderItemId: item.id, orderId: item.order_id, orderNo: order.order_no, productName: item.product_name, variantLabel: item.variant_label, quantity: item.quantity, remaining, unitPrice: num(item.unit_price), deliveredAt: order.delivered_at, deadline: new Date(deadline).toISOString() });
    }
    return result.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  return {
    listMine,
    async listForStore() {
      if (!ctx.storeId) return [];
      const data = rows<ReturnJoin>(unwrap(await client.from("returns").select(SELECT).eq("store_id", ctx.storeId).order("created_at", { ascending: false }).limit(200)));
      return withEvents(client, data);
    },
    listReturnable,
    async create(input: CreateReturnInput) {
      await callRpc(client, "create_return", { p_order_item_id: input.orderItemId, p_quantity: input.quantity, p_reason: input.reason, p_description: input.description ?? null });
    },
    async transition(returnId: string, to: DbReturnStatus, options: ReturnTransitionOptions = {}) {
      await callRpc(client, "transition_return", { p_return_id: returnId, p_to: to, p_note: options.note ?? null, p_carrier: options.carrier ?? null, p_tracking: options.tracking ?? null, p_restock: options.restock ?? true });
    },
  };
}
