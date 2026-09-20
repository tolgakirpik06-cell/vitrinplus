"use client";

import { AlertCircle, ArrowRight, CheckCircle2, MapPinOff, PackageX, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionAlert } from "@/lib/seller-analytics";
import type { OrderAlertFilter } from "@/lib/seller-orders";

const alertMeta: Record<string, { filter: OrderAlertFilter; icon: LucideIcon }> = {
  address: { filter: "adres", icon: MapPinOff },
  late: { filter: "geciken", icon: Timer },
  stock: { filter: "stok", icon: PackageX },
};

/** "Aksiyon Gerekiyor" şeridi (referans 13). Boşsa sakin bir "her şey yolunda" durumu gösterir. */
export function ActionNeededPanel({ alerts, active, onSelect }: { alerts: ActionAlert[]; active: OrderAlertFilter; onSelect: (filter: OrderAlertFilter) => void }) {
  if (alerts.length === 0) {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[13px] font-semibold text-emerald-800">
        <CheckCircle2 size={18} aria-hidden /> Şu an aksiyon gerektiren bir sipariş yok.
      </div>
    );
  }
  const total = alerts.reduce((sum, alert) => sum + alert.count, 0);
  return (
    <section aria-label="Aksiyon gerektiren siparişler" className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white px-4 py-3">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-rose-600">
        <AlertCircle size={18} aria-hidden /> Aksiyon Gerekiyor ({total})
      </h2>
      <ul className="flex flex-1 flex-wrap items-center gap-2">
        {alerts.map((alert) => {
          const meta = alertMeta[alert.id];
          const Icon = meta?.icon ?? AlertCircle;
          const filter = meta?.filter ?? "hepsi";
          const selected = active === filter;
          return (
            <li key={alert.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? "" : filter)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[12.5px] font-medium text-navy-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500",
                  selected ? "border-rose-400 bg-rose-50" : "border-rose-100 hover:border-rose-300"
                )}
              >
                <Icon size={14} aria-hidden className={alert.tone === "danger" ? "text-rose-500" : "text-amber-500"} />
                {alert.label}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onSelect(active === "hepsi" ? "" : "hepsi")}
        className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-royal-600 hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-royal-500"
      >
        {active === "hepsi" ? "Süzgeci Kaldır" : "Tümünü Gör"} <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
