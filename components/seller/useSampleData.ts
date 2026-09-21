"use client";

import { useCallback } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { useToast } from "@/components/dashboard/Toast";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { addQuestions, removeSampleQuestions } from "@/lib/questions";
import { buildSampleData, isSampleOrderId, isSampleProduct, SAMPLE_MOVEMENT_PREFIX } from "@/lib/seller-sample-data";

/**
 * Demo örnek verisini yükler / kaldırır. Yalnızca "örnek" işaretli kayıtlara dokunur;
 * kullanıcının kendi ürün ve siparişleri korunur.
 */
export function useSampleData() {
  const toast = useToast();
  const { updateShop, injectOrders, removeOrders, mode } = useDemo();
  /** Örnek veri yalnızca demo modundadır; gerçek hesap modunda sahte kayıtlar veritabanına yazılmaz. */
  const available = mode === "demo";
  const { owner, shop, products, rows, updateOps } = useSellerWorkspace();
  const loaded = products.some(isSampleProduct) || rows.some((row) => isSampleOrderId(row.order.id));

  const load = useCallback(() => {
    try {
      const data = buildSampleData({ ownerId: owner.id, storeName: shop.settings.storeName, now: new Date() });
      updateShop((current) => {
        const skus = new Set(current.products.map((product) => product.sku));
        const ids = new Set(current.products.map((product) => product.id));
        const fresh = data.products.filter((product) => !skus.has(product.sku) && !ids.has(product.id));
        return { ...current, products: [...current.products, ...fresh] };
      });
      injectOrders(data.orders);
      updateOps((ops) => ({
        ...ops,
        orderMeta: { ...ops.orderMeta, ...data.metas },
        stockMovements: [...data.movements.filter((movement) => !ops.stockMovements.some((existing) => existing.id === movement.id)), ...ops.stockMovements],
        sampleLoaded: true,
      }));
      addQuestions(data.questions);
      toast.success("Örnek veri yüklendi. Panel artık dolu bir mağaza gibi görünüyor.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Örnek veri yüklenemedi.");
    }
  }, [owner.id, shop.settings.storeName, updateShop, injectOrders, updateOps, toast]);

  const remove = useCallback(() => {
    try {
      const orderIds = rows.filter((row) => isSampleOrderId(row.order.id)).map((row) => row.order.id);
      updateShop((current) => ({ ...current, products: current.products.filter((product) => !isSampleProduct(product)) }));
      removeOrders(orderIds);
      updateOps((ops) => {
        const orderMeta = { ...ops.orderMeta };
        for (const id of orderIds) delete orderMeta[id];
        return { ...ops, orderMeta, stockMovements: ops.stockMovements.filter((movement) => !movement.id.startsWith(SAMPLE_MOVEMENT_PREFIX)), sampleLoaded: false };
      });
      removeSampleQuestions(shop.settings.storeName);
      toast.success("Örnek veri kaldırıldı. Kendi eklediğin kayıtlara dokunulmadı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Örnek veri kaldırılamadı.");
    }
  }, [rows, updateShop, removeOrders, updateOps, shop.settings.storeName, toast]);

  return { loaded, load, remove, available };
}
