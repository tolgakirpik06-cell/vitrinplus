"use client";

import { Printer } from "lucide-react";
import { Modal } from "@/components/dashboard/Modal";
import { ActionButton } from "@/components/dashboard/form";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import type { SellerOrderRow } from "@/lib/seller-analytics";

function Barcode({ seed }: { seed: string }) {
  // Yalnızca görsel: takip numarasından türeyen çubuklar (gerçek barkod değildir).
  const bars = Array.from(seed).flatMap((char, index) => {
    const code = char.charCodeAt(0);
    return [(code % 3) + 1, ((code + index) % 2) + 1];
  });
  return (
    <div aria-hidden className="flex h-10 items-stretch gap-[2px] overflow-hidden">
      {bars.map((width, index) => (
        <span key={index} className={index % 2 === 0 ? "bg-navy-900" : "bg-transparent"} style={{ width: width * 1.5 }} />
      ))}
    </div>
  );
}

/**
 * Demo kargo etiketi önizlemesi. Gerçek kargo servisine bağlı değildir; etiketler
 * "yazdırıldı" olarak işaretlenince sipariş Kargoya Hazır durumuna geçer.
 */
export function LabelModal({ rows, open, onClose, onConfirm }: { rows: SellerOrderRow[]; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const { shop } = useSellerWorkspace();
  const pending = rows.filter((row) => row.meta.labelCreated && !row.meta.labelPrinted).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Kargo Etiketleri (${rows.length})`}
      description="Bu etiketler demodur; gerçek kargo firması entegrasyonu bağlı değildir. Yazdırdıktan sonra “Yazdırıldı Olarak İşaretle” ile siparişleri Kargoya Hazır durumuna al."
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Kapat
          </ActionButton>
          <ActionButton variant="primary" onClick={onConfirm} disabled={pending === 0}>
            <Printer size={14} aria-hidden /> Yazdırıldı Olarak İşaretle
          </ActionButton>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Yazdırılacak etiket yok. Önce siparişler için kargo etiketi oluştur.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const tracking = row.meta.tracking ?? "—";
            return (
              <li key={row.order.id} className="rounded-xl border-2 border-dashed border-navy-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-royal-600">VitrinPlus · Demo Etiket</p>
                    <p className="mt-0.5 text-[13px] font-extrabold text-navy-900">{row.carrier}</p>
                  </div>
                  <span className="rounded-md bg-navy-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-600">#{row.order.id}</span>
                </div>
                <div className="mt-2.5">
                  <Barcode seed={tracking} />
                  <p className="mt-1 text-center font-mono text-[12px] font-bold tracking-widest text-navy-800">{tracking}</p>
                </div>
                <dl className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-[12px]">
                  <div>
                    <dt className="text-[10.5px] font-semibold uppercase text-muted">Alıcı</dt>
                    <dd className="font-semibold text-navy-800">{row.customer.name}</dd>
                    <dd className="text-navy-600">{row.order.address}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-semibold uppercase text-muted">Gönderici</dt>
                    <dd className="text-navy-700">{shop.settings.storeName}</dd>
                  </div>
                  <p className="text-[11px] text-muted">
                    {row.items.length} kalem · {row.quantity} adet {row.meta.labelPrinted ? "· Yazdırıldı" : ""}
                  </p>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
