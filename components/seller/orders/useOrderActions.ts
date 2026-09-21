"use client";

import { useMemo } from "react";
import { useToast } from "@/components/dashboard/Toast";
import { useDemo } from "@/components/demo/DemoProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import type { SellerOrderRow } from "@/lib/seller-analytics";
import { withOrderEvent, withOrderMeta, type OrderMeta } from "@/lib/seller-ops";
import { demoInvoiceNo, demoTrackingNo, isWaiting } from "@/lib/seller-orders";

type BatchResult = { done: number; skipped: number; failed: number; error?: string };

export type ShipOptions = { carrier?: string; tracking?: string; onlyReady?: boolean };

/**
 * Sipariş durum geçişleri. Durum değişimi mevcut `transitionOrder` kuralıyla (DemoProvider.changeOrder)
 * yapılır — stok iadesi, yetki ve geçiş kontrolü orada kalır. Kargo etiketi, takip no, olay zamanları
 * gibi ek bilgiler satıcı operasyon kaydına (`seller-ops`) yazılır.
 */
export function useOrderActions() {
  const toast = useToast();
  const { changeOrder, markReadyToShip, saveOrderDetails, mode } = useDemo();
  const live = mode === "supabase";
  const { rows, updateOps } = useSellerWorkspace();

  return useMemo(() => {
    const byId = new Map(rows.map((row) => [row.order.id, row]));

    function batch(ids: string[], eligible: (row: SellerOrderRow) => boolean, apply: (row: SellerOrderRow, at: string) => void): BatchResult {
      const result: BatchResult = { done: 0, skipped: 0, failed: 0 };
      for (const id of ids) {
        const row = byId.get(id);
        if (!row || !row.manageable || !eligible(row)) {
          result.skipped += 1;
          continue;
        }
        try {
          apply(row, new Date().toISOString());
          result.done += 1;
        } catch (error) {
          result.failed += 1;
          result.error ??= error instanceof Error ? error.message : undefined;
        }
      }
      return result;
    }

    function report(result: BatchResult, success: (count: number) => string): BatchResult {
      if (result.done > 0) {
        const skipped = result.skipped > 0 ? ` ${result.skipped} sipariş bu adım için uygun olmadığından atlandı.` : "";
        toast.success(`${success(result.done)}${skipped}`);
      } else if (result.failed > 0) {
        toast.error(result.error ?? "İşlem tamamlanamadı.");
      } else {
        toast.info("Seçili siparişler bu adım için uygun değil.");
      }
      return result;
    }

    const prepare = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => row.ui === "yeni",
          (row, at) => {
            changeOrder(row.order.id, "hazirlaniyor");
            updateOps((ops) => withOrderEvent(ops, row.order.id, "hazirlaniyor", at));
          }
        ),
        (count) => `${count} sipariş hazırlanıyor durumuna alındı.`
      );

    const createLabels = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => row.ui === "hazirlaniyor" && !row.meta.labelCreated,
          (row, at) =>
            // Gerçek modda takip numarası UYDURULMAZ; satıcı kargo firmasından aldığı numarayı kendisi girer.
            updateOps((ops) => withOrderEvent(withOrderMeta(ops, row.order.id, { labelCreated: true, carrier: row.carrier, tracking: live ? row.meta.tracking : row.meta.tracking ?? demoTrackingNo(row.order.id) }), row.order.id, "etiket", at))
        ),
        (count) => (live ? `${count} sipariş için kargo etiketi hazırlandı olarak işaretlendi. Kargo firması entegrasyonu yoktur; takip numarasını sipariş detayından gir.` : `${count} sipariş için demo kargo etiketi oluşturuldu.`)
      );

    const markPrinted = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => row.ui === "hazirlaniyor" && row.meta.labelCreated === true && !row.meta.labelPrinted,
          (row) => {
            markReadyToShip(row.order.id); // Gerçek modda sunucuya "kargoya hazır" olarak yazılır (demo modunda etkisizdir).
            updateOps((ops) => withOrderMeta(ops, row.order.id, { labelPrinted: true }));
          }
        ),
        (count) => `${count} sipariş etiketi yazdırıldı olarak işaretlendi. Siparişler Kargoya Hazır.`
      );

    const ship = (ids: string[], options: ShipOptions = {}) =>
      report(
        batch(
          ids,
          (row) => (options.onlyReady ? row.ui === "kargoya-hazir" : isWaiting(row)),
          (row, at) => {
            if (row.order.status === "alindi") {
              changeOrder(row.order.id, "hazirlaniyor");
              updateOps((ops) => withOrderEvent(ops, row.order.id, "hazirlaniyor", at));
            }
            const carrier = options.carrier?.trim() || row.carrier;
            const tracking = options.tracking?.trim() || row.meta.tracking || (live ? undefined : demoTrackingNo(row.order.id));
            changeOrder(row.order.id, "kargoda", false, { carrier, tracking });
            updateOps((ops) => withOrderEvent(withOrderMeta(ops, row.order.id, { carrier, tracking, labelCreated: true, labelPrinted: true }), row.order.id, "kargoda", at));
          }
        ),
        (count) => `${count} sipariş kargoya verildi.`
      );

    const outForDelivery = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => row.ui === "kargoda" && !row.meta.outForDelivery,
          (row, at) => updateOps((ops) => withOrderEvent(withOrderMeta(ops, row.order.id, { outForDelivery: true }), row.order.id, "dagitimda", at))
        ),
        (count) => `${count} sipariş dağıtıma çıktı olarak işaretlendi.`
      );

    const deliver = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => row.ui === "kargoda",
          (row, at) => {
            changeOrder(row.order.id, "teslim-edildi");
            updateOps((ops) => withOrderEvent(withOrderEvent(withOrderMeta(ops, row.order.id, { outForDelivery: true }), row.order.id, "dagitimda", at), row.order.id, "teslim-edildi", at));
          }
        ),
        (count) => `${count} sipariş teslim edildi olarak işaretlendi.`
      );

    const cancel = (ids: string[]) =>
      report(
        batch(
          ids,
          (row) => isWaiting(row),
          (row, at) => {
            changeOrder(row.order.id, "iptal-edildi");
            updateOps((ops) => withOrderEvent(ops, row.order.id, "iptal-edildi", at));
          }
        ),
        (count) => `${count} sipariş iptal edildi. Stoklar geri yüklendi.`
      );

    function createInvoice(id: string): boolean {
      const row = byId.get(id);
      if (!row || row.ui === "iptal" || row.meta.invoiceNo) return false;
      if (live) {
        // E-fatura entegrasyonu yok: sahte fatura numarası üretilmez.
        toast.info("E-fatura entegrasyonu henüz bağlı değil. Faturayı kendi sisteminden kesmelisin.");
        return false;
      }
      try {
        const at = new Date();
        updateOps((ops) => withOrderMeta(ops, id, { invoiceNo: demoInvoiceNo(id, at), invoiceAt: at.toISOString() }));
        toast.success("Demo fatura oluşturuldu.");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Fatura oluşturulamadı.");
        return false;
      }
    }

    function saveDetails(id: string, patch: Pick<OrderMeta, "carrier" | "tracking" | "notes">): boolean {
      try {
        saveOrderDetails(id, { carrier: patch.carrier?.trim() ?? "", tracking: patch.tracking?.trim() ?? "", notes: patch.notes?.trim() ?? "" });
        updateOps((ops) => withOrderMeta(ops, id, { carrier: patch.carrier?.trim() || undefined, tracking: patch.tracking?.trim() || undefined, notes: patch.notes?.trim() || undefined }));
        toast.success("Sipariş bilgileri kaydedildi.");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Kaydedilemedi.");
        return false;
      }
    }

    function sendMessage(id: string, text: string): boolean {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (live) {
        toast.info("Müşteriye mesaj gönderme henüz aktif değil.");
        return false;
      }
      try {
        const at = new Date().toISOString();
        updateOps((ops) => withOrderMeta(ops, id, { messages: [...(ops.orderMeta[id]?.messages ?? []), { text: trimmed, at }] }));
        toast.success("Mesaj demo olarak kaydedildi. Gerçek bildirim gönderilmez.");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Mesaj kaydedilemedi.");
        return false;
      }
    }

    return { prepare, createLabels, markPrinted, ship, outForDelivery, deliver, cancel, createInvoice, saveDetails, sendMessage };
  }, [rows, changeOrder, markReadyToShip, saveOrderDetails, live, updateOps, toast]);
}

export type OrderActions = ReturnType<typeof useOrderActions>;
