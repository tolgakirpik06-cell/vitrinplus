"use client";

import { useToast } from "@/components/dashboard/Toast";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import type { SellerProduct } from "@/lib/demo-marketplace";
import { withStockMovements } from "@/lib/seller-ops";
import { toMovements, type StockChange } from "@/lib/seller-stock";

/**
 * Stok değişikliklerini kaydeder: ürün stoku/kritik seviyesi tek işlemde (hepsi ya da hiçbiri) güncellenir,
 * ardından stok hareketleri satıcı operasyon kaydına yazılır.
 */
export function useStockActions() {
  const toast = useToast();
  const { patchProducts, updateProducts, deleteProducts } = useSellerData();
  const { updateOps } = useSellerWorkspace();

  function save(changes: StockChange[]): boolean {
    if (changes.length === 0) return false;
    try {
      const patches: Record<string, Partial<Omit<SellerProduct, "id" | "sku">>> = {};
      for (const change of changes) patches[change.product.id] = { stock: change.stock, criticalThreshold: change.threshold };
      patchProducts(patches);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Stok güncellenemedi.");
      return false;
    }
    const movements = toMovements(changes, new Date().toISOString(), () => crypto.randomUUID());
    try {
      updateOps((ops) => withStockMovements(ops, movements));
    } catch {
      toast.info("Stok güncellendi ancak hareket kaydı yazılamadı.");
    }
    const stillPassive = changes.filter((change) => change.previousStock <= 0 && change.stock > 0 && change.product.status === "pasif").length;
    toast.success(`${changes.length} ürünün stok bilgisi kaydedildi.${stillPassive > 0 ? ` ${stillPassive} ürün pasifte; satışa almak için “Aktif Yap”ı kullan.` : ""}`);
    return true;
  }

  function setStatus(ids: string[], status: "aktif" | "pasif"): boolean {
    try {
      updateProducts(ids, { status });
      toast.success(status === "aktif" ? `${ids.length} ürün satışa alındı.` : `${ids.length} ürün pasife alındı.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Durum güncellenemedi.");
      return false;
    }
  }

  function remove(ids: string[]): boolean {
    try {
      deleteProducts(ids);
      toast.success(`${ids.length} ürün silindi.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ürünler silinemedi.");
      return false;
    }
  }

  return { save, setStatus, remove };
}
