import type { StockRepository } from "@/lib/repositories/types";
import type { StockMovementRow } from "@/types/database";
import { rows, unwrap, type Client } from "./common";
import { mapMovement } from "./mappers";

export function createStockRepository(client: Client, ctx: { storeId: string | null }): StockRepository {
  return {
    async movements(options = {}) {
      if (!ctx.storeId) return [];
      let query = client.from("stock_movements").select("*").eq("store_id", ctx.storeId).order("created_at", { ascending: false }).limit(Math.min(options.limit ?? 200, 500));
      if (options.productId) query = query.eq("product_id", options.productId);
      return rows<StockMovementRow>(unwrap(await query)).map(mapMovement);
    },
  };
}
