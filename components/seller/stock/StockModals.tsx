"use client";

import { Modal } from "@/components/dashboard/Modal";
import { ActionButton } from "@/components/dashboard/form";
import { MovementList } from "@/components/seller/stock/MovementList";
import { formatDaysLeft, type StockRow } from "@/lib/seller-analytics";
import type { StockMovement } from "@/lib/seller-ops";
import { formatInteger } from "@/lib/format";

/** Tüm ürünlerin son stok hareketleri (manuel giriş/düşüm + siparişlerden gelen satış/iptal). */
export function StockMovementsModal({ open, onClose, movements, productNames }: { open: boolean; onClose: () => void; movements: StockMovement[]; productNames: ReadonlyMap<string, string> }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Stok Hareketleri"
      description={`Son ${Math.min(100, movements.length)} hareket gösteriliyor. + giriş, − çıkış.`}
      footer={
        <ActionButton variant="secondary" onClick={onClose}>
          Kapat
        </ActionButton>
      }
    >
      <MovementList movements={movements} productNames={productNames} limit={100} emptyText="Henüz stok hareketi yok. Stok güncelledikçe ve sipariş aldıkça burada listelenir." />
    </Modal>
  );
}

type AlertGroup = { key: string; title: string; rows: StockRow[]; detail: (row: StockRow) => string };

/** Stok uyarıları: stokta olmayan, kritik seviyede olan ve 7 gün içinde bitebilecek ürünler. */
export function StockAlertsModal({ open, onClose, rows, onOpenProduct }: { open: boolean; onClose: () => void; rows: StockRow[]; onOpenProduct: (id: string) => void }) {
  const allGroups: AlertGroup[] = [
    { key: "out", title: "Stokta olmayanlar", rows: rows.filter((row) => row.status === "out"), detail: () => "Satışa kapalı" },
    { key: "critical", title: "Kritik seviyede", rows: rows.filter((row) => row.status === "critical"), detail: (row) => `${formatInteger(row.sellable)} adet · eşik ${row.threshold}` },
    { key: "fast", title: "7 gün içinde bitebilir", rows: rows.filter((row) => row.fast && row.status !== "critical" && row.status !== "out"), detail: (row) => `${formatInteger(row.sellable)} adet · yaklaşık ${formatDaysLeft(row)}` },
  ];
  const groups = allGroups.filter((group) => group.rows.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stok Uyarıları"
      description="Bir ürünü seçerek stok detayını aç."
      footer={
        <ActionButton variant="secondary" onClick={onClose}>
          Kapat
        </ActionButton>
      }
    >
      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Şu an stok uyarısı yok. Stok durumun sağlıklı görünüyor.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.title}>
              <h3 className="mb-1.5 text-[13px] font-extrabold text-navy-900">
                {group.title} ({group.rows.length})
              </h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {group.rows.map((row) => (
                  <li key={row.product.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProduct(row.product.id);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-royal-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-royal-500"
                    >
                      <span className="min-w-0 truncate font-semibold text-navy-800">{row.product.name}</span>
                      <span className="shrink-0 text-xs text-muted">{group.detail(row)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
