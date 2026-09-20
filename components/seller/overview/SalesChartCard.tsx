"use client";

import { LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { AreaChart } from "@/components/dashboard/charts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Tabs } from "@/components/dashboard/Tabs";
import { formatTL } from "@/lib/format";
import { buildSeries, type SeriesRange } from "@/lib/seller-analytics";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

const ranges: { key: SeriesRange; label: string }[] = [
  { key: "today", label: "Bugün" },
  { key: "7d", label: "7 Gün" },
  { key: "30d", label: "30 Gün" },
  { key: "year", label: "Bu Yıl" },
];

const subtitles: Record<SeriesRange, string> = {
  today: "Bugünkü saatlik ciro (iptaller hariç)",
  "7d": "Son 7 günün günlük cirosu (iptaller hariç)",
  "30d": "Son 30 günün günlük cirosu (iptaller hariç)",
  year: "Son 12 ayın aylık cirosu (iptaller hariç)",
};

export function SalesChartCard() {
  const { rows, now } = useSellerWorkspace();
  const [range, setRange] = useState<SeriesRange>("7d");
  const points = useMemo(() => buildSeries(rows, range, now), [rows, range, now]);
  const total = points.reduce((sum, point) => sum + point.revenue, 0);
  const orders = points.reduce((sum, point) => sum + point.orders, 0);

  return (
    <ChartCard
      title="Satış Grafiği"
      subtitle={subtitles[range]}
      controls={<Tabs variant="segment" label="Grafik dönemi" items={ranges} value={range} onChange={setRange} />}
      footer={
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <span>
            Toplam ciro: <strong className="font-bold text-navy-900">{formatTL(total)}</strong>
          </span>
          <span>
            Sipariş: <strong className="font-bold text-navy-900">{orders}</strong>
          </span>
        </p>
      }
    >
      {rows.length === 0 ? (
        <EmptyState compact icon={LineChart} title="Henüz satış verisi yok" description="İlk siparişini aldığında satış grafiğin burada görünür." />
      ) : (
        <AreaChart points={points.map((point) => ({ label: point.label, value: point.revenue }))} format={formatTL} height={230} ariaLabel={`${subtitles[range]} grafiği`} />
      )}
    </ChartCard>
  );
}
