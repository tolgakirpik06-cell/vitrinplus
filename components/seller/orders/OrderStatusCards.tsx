"use client";

import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, Clock3, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { IconTile, type IconTone } from "@/components/dashboard/StatCard";
import { cn } from "@/lib/utils";
import { formatInteger, formatTL } from "@/lib/format";
import { orderUiLabels, sumAmount, type OrderCounts, type OrderUiStatus, type SellerOrderRow } from "@/lib/seller-analytics";

const cards: { status: OrderUiStatus; label: string; icon: LucideIcon; tone: IconTone }[] = [
  { status: "yeni", label: "Yeni Siparişler", icon: ShoppingBag, tone: "violet" },
  { status: "hazirlaniyor", label: "Hazırlanıyor", icon: Clock3, tone: "amber" },
  { status: "kargoya-hazir", label: "Kargoya Hazır", icon: PackageCheck, tone: "amber" },
  { status: "kargoda", label: "Kargoda", icon: Truck, tone: "blue" },
  { status: "teslim-edildi", label: "Teslim Edildi", icon: CheckCircle2, tone: "green" },
  { status: "iptal", label: "İade / İptal", icon: Ban, tone: "rose" },
];

/** Durum özet kartları (referans 13). Kart seçilince liste o duruma göre süzülür; tekrar seçilince süzgeç kalkar. */
export function OrderStatusCards({
  rows,
  counts,
  active,
  onSelect,
}: {
  rows: SellerOrderRow[];
  counts: OrderCounts;
  active: OrderUiStatus | "bekleyen" | "";
  onSelect: (status: OrderUiStatus | "") => void;
}) {
  return (
    <ul aria-label="Sipariş durumu özeti" className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const selected = active === card.status;
        return (
          <li key={card.status} className="min-w-0">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${card.label}: ${counts[card.status]} sipariş. ${selected ? "Süzgeci kaldır" : `${orderUiLabels[card.status]} siparişlerini göster`}`}
              onClick={() => onSelect(selected ? "" : card.status)}
              className={cn(
                "flex h-full w-full flex-col gap-2 rounded-2xl border bg-white p-3.5 text-left shadow-panel transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500",
                selected ? "border-royal-400 bg-royal-50/40 ring-1 ring-royal-300" : "border-line hover:border-royal-200"
              )}
            >
              <span className="flex items-center gap-2.5">
                <IconTile icon={card.icon} tone={card.tone} className="h-9 w-9" />
                <span className="min-w-0 truncate text-xs font-semibold text-navy-700">{card.label}</span>
              </span>
              <span className="text-[24px] font-extrabold leading-none tracking-tight text-navy-900 tabular-nums">{formatInteger(counts[card.status])}</span>
              <span className="truncate text-[11px] text-muted">Toplam: {formatTL(sumAmount(rows, (row) => row.ui === card.status))}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
