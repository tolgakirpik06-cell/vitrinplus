import type { StockMovement } from "@/lib/seller-ops";
import type { StockMovementView } from "@/lib/repositories/types";
import type { DbStockMovementType } from "@/types/database";

/** Gerçek mod: sunucudaki stok hareketi tipinin arayüz etiketi. */
export const movementTypeLabels: Record<DbStockMovementType, string> = {
  initial: "İlk stok",
  manual_add: "Manuel stok girişi",
  manual_remove: "Manuel stok çıkışı",
  manual_set: "Stok güncelleme",
  sale: "Satış",
  order_cancel: "Sipariş iptali",
  return_restock: "İade / stoğa geri ekleme",
  adjustment: "Düzeltme",
};

/** Sunucu stok hareketini satıcı panelinin ortak hareket türüne çevirir. Silinmiş ürünlerin (productId yok) hareketi atlanır. */
export function toUiMovement(view: StockMovementView): StockMovement | null {
  if (!view.productId) return null;
  const label = movementTypeLabels[view.type];
  return { id: view.id, productId: view.productId, delta: view.change, reason: view.note ? `${label} · ${view.note}` : label, at: view.createdAt };
}
