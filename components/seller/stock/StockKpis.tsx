import { Archive, ArrowRightLeft, Box, CircleAlert, CircleX } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatInteger, formatTL } from "@/lib/format";
import type { StockRow, StockSummary } from "@/lib/seller-analytics";

/** Stok KPI şeridi (referans 24). */
export function StockKpis({ summary, rows }: { summary: StockSummary; rows: StockRow[] }) {
  const net = summary.todayIn - summary.todayOut;
  const missingCost = rows.filter((row) => row.sellable > 0 && row.product.cost <= 0).length;
  return (
    <ul aria-label="Stok özeti" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
      <li className="min-w-0">
        <StatCard icon={Box} tone="violet" label="Toplam Stok Değeri" value={formatTL(summary.totalValue)} note={missingCost > 0 ? `Maliyeti girilmeyen ${missingCost} ürün hariç` : "Maliyet bazında toplam değer"} className="h-full" />
      </li>
      <li className="min-w-0">
        <StatCard icon={CircleAlert} tone="amber" label="Kritik Stok" value={`${formatInteger(summary.critical)} ürün`} note="Kritik seviyede ya da altında" className="h-full" />
      </li>
      <li className="min-w-0">
        <StatCard icon={CircleX} tone="rose" label="Stokta Yok" value={`${formatInteger(summary.out)} ürün`} note="Stok adedi 0 olan ürünler" className="h-full" />
      </li>
      <li className="min-w-0">
        <StatCard icon={Archive} tone="green" label="Fazla Stok" value={`${formatInteger(summary.excess)} ürün`} note="90 günden fazla stokta" className="h-full" />
      </li>
      <li className="min-w-0">
        <StatCard
          icon={ArrowRightLeft}
          tone="violet"
          label="Bugün Stok Değişimi"
          value={`${net > 0 ? "+" : net < 0 ? "−" : ""}${formatInteger(Math.abs(net))} adet`}
          note={`${formatInteger(summary.todayIn)} giriş / ${formatInteger(summary.todayOut)} çıkış`}
          className="h-full"
        />
      </li>
    </ul>
  );
}
