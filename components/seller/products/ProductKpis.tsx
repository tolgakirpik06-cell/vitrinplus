"use client";

import { AlertTriangle, CheckCircle2, Package, PauseCircle, PackageX } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatInteger, formatPercent } from "@/lib/format";
import type { ProductTab } from "@/lib/seller-products";

/** Ürünler ekranı KPI satırı: Toplam / Aktif / Pasif / Kritik Stok / Stokta Yok. */
export function ProductKpis({ counts }: { counts: Record<ProductTab, number> }) {
  const share = (value: number) => (counts.tumu > 0 ? formatPercent((value / counts.tumu) * 100, 0) : "—");
  return (
    <section aria-label="Ürün özeti" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard icon={Package} tone="violet" label="Toplam Ürün" value={formatInteger(counts.tumu)} note="Mağazandaki toplam ürün" />
      <StatCard icon={CheckCircle2} tone="green" label="Aktif Ürün" value={formatInteger(counts.aktif)} note={`${share(counts.aktif)} · Satışta olan ürünler`} />
      <StatCard icon={PauseCircle} tone="amber" label="Pasif Ürün" value={formatInteger(counts.pasif)} note={counts.taslak > 0 ? `${counts.taslak} taslak · Satışta olmayan` : "Satışta olmayan ürünler"} />
      <StatCard icon={AlertTriangle} tone="rose" label="Kritik Stok" value={formatInteger(counts.kritik)} note="Stok kritik eşiğin altında" />
      <StatCard icon={PackageX} tone="slate" label="Stokta Yok" value={formatInteger(counts.stokyok)} note="Stok adedi 0 olan ürünler" />
    </section>
  );
}
