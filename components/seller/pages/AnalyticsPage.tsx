"use client";

import Link from "next/link";
import { BarChart3, Boxes, LineChart, Percent, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { AreaChart } from "@/components/dashboard/charts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { linkButtonClass } from "@/components/dashboard/form";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";
import { cn } from "@/lib/utils";
import { formatInteger, formatPercent, formatSignedTL, formatTL } from "@/lib/format";
import { hasFeature } from "@/lib/plans";
import { unitCost } from "@/lib/profit";
import { buildProductPerformance, buildSeries, type ProductPerformance, type SeriesRange } from "@/lib/seller-analytics";
import type { SellerProduct } from "@/lib/demo-marketplace";

type Tab = "satis" | "kar" | "envanter";

const ranges: { key: SeriesRange; label: string }[] = [
  { key: "7d", label: "7 Gün" },
  { key: "30d", label: "30 Gün" },
  { key: "year", label: "Bu Yıl" },
];

function CostInput({ product }: { product: SellerProduct }) {
  const toast = useToast();
  const { updateProduct } = useSellerData();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(product.cost);

  function commit() {
    if (draft === null) return;
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Maliyet 0 veya daha büyük bir sayı olmalı.");
      setDraft(null);
      return;
    }
    if (value !== product.cost) {
      try {
        updateProduct(product.id, { cost: value });
        toast.success("Maliyet güncellendi.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Maliyet kaydedilemedi.");
      }
    }
    setDraft(null);
  }

  return (
    <input
      inputMode="decimal"
      aria-label={`${product.name} birim maliyeti (TL)`}
      value={shown}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="h-9 w-24 rounded-lg border border-line bg-white px-2.5 text-right text-[13px] font-medium tabular-nums text-navy-800 focus-visible:border-royal-400 focus-visible:outline-2 focus-visible:outline-royal-200"
    />
  );
}

function SalesTab() {
  const { rows, now, products, planKey } = useSellerWorkspace();
  const [range, setRange] = useState<SeriesRange>("30d");
  const points = useMemo(() => buildSeries(rows, range, now), [rows, range, now]);
  const revenue = points.reduce((sum, point) => sum + point.revenue, 0);
  const orders = points.reduce((sum, point) => sum + point.orders, 0);
  const performance = useMemo(() => buildProductPerformance(products, rows), [products, rows]);
  const advanced = hasFeature(planKey, "advancedReports");
  const bySales = [...performance].filter((item) => item.sold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const byProfit = [...performance].filter((item) => item.profit !== null && item.sold > 0).sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Satış özeti" className="grid gap-3 sm:grid-cols-3">
        <li>
          <StatCard icon={Wallet} tone="violet" label="Ciro" value={formatTL(revenue)} note="Seçili dönem, iptaller hariç" className="h-full" />
        </li>
        <li>
          <StatCard icon={ShoppingBag} tone="blue" label="Sipariş" value={formatInteger(orders)} className="h-full" />
        </li>
        <li>
          <StatCard icon={TrendingUp} tone="green" label="Ortalama Sipariş Tutarı" value={orders > 0 ? formatTL(revenue / orders) : "—"} className="h-full" />
        </li>
      </ul>

      <ChartCard title="Satış Grafiği" subtitle="İptal edilmeyen siparişlerin cirosu" controls={<Tabs variant="segment" label="Grafik dönemi" items={ranges} value={range} onChange={setRange} />}>
        {rows.length === 0 ? (
          <EmptyState compact icon={LineChart} title="Henüz satış verisi yok" description="İlk siparişini aldığında grafik burada görünür." />
        ) : (
          <AreaChart points={points.map((point) => ({ label: point.label, value: point.revenue }))} format={formatTL} height={240} ariaLabel="Ciro grafiği" />
        )}
      </ChartCard>

      {advanced ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <TopList title="En Çok Satan Ürünler" subtitle="Ciroya göre" items={bySales} value={(item) => formatTL(item.revenue)} note={(item) => `${formatInteger(item.sold)} adet`} />
          <TopList title="En Çok Kazandıran Ürünler" subtitle="Tahmini kâra göre (maliyeti girilenler)" items={byProfit} value={(item) => formatSignedTL(item.profit ?? 0)} note={(item) => `${formatInteger(item.sold)} adet`} />
        </div>
      ) : (
        <UpgradeLock variant="inline" feature="advancedReports" currentPlan={planKey} description="En çok satan ve en çok kazandıran ürün raporları Vitrin Plus ile açılır." />
      )}
    </div>
  );
}

function TopList({ title, subtitle, items, value, note }: { title: string; subtitle: string; items: ProductPerformance[]; value: (item: ProductPerformance) => string; note: (item: ProductPerformance) => string }) {
  return (
    <Panel aria-label={title}>
      <PanelHeader title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="Henüz veri yok" description="Satış ve maliyet verisi oluştukça burada listelenir." />
      ) : (
        <ol className="divide-y divide-line/80">
          {items.map((item, index) => (
            <li key={item.product.id} className="flex items-center gap-3 py-2.5 text-[13px]">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-royal-50 text-xs font-bold text-royal-700">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-navy-900">{item.product.name}</span>
                <span className="block text-xs text-muted">{note(item)}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-navy-900">{value(item)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

type ProfitLine = { product: SellerProduct; cost: number; profit: number; margin: number; potential: number };

function ProfitTab() {
  const { products } = useSellerWorkspace();
  const lines = useMemo<ProfitLine[]>(
    () =>
      products.map((product) => {
        const cost = unitCost(product);
        const profit = product.price - cost;
        return { product, cost, profit, margin: product.price > 0 ? (profit / product.price) * 100 : 0, potential: profit * product.stock };
      }),
    [products]
  );
  // Eski Kâr Analizi formülleri: potansiyel kâr = Σ max(0, fiyat − maliyet) × stok; ortalama marj = fiyatı olan ürünlerin marj ortalaması.
  const potentialProfit = lines.reduce((sum, line) => sum + Math.max(0, line.profit) * line.product.stock, 0);
  const margins = lines.filter((line) => line.product.price > 0).map((line) => line.margin);
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const columns: Column<ProfitLine>[] = [
    { key: "name", header: "Ürün", cell: (line) => <span className="block max-w-[220px] truncate font-semibold text-navy-900">{line.product.name}</span> },
    { key: "price", header: "Satış Fiyatı", align: "right", cell: (line) => <span className="whitespace-nowrap tabular-nums">{formatTL(line.product.price)}</span> },
    { key: "cost", header: "Maliyet", align: "right", cell: (line) => <CostInput key={`${line.product.id}-${line.product.cost}`} product={line.product} /> },
    { key: "profit", header: "Birim Kâr", align: "right", hideBelow: "md", cell: (line) => <span className={cn("whitespace-nowrap font-semibold tabular-nums", line.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatSignedTL(line.profit)}</span> },
    { key: "margin", header: "Kâr Marjı", align: "right", cell: (line) => <span className={cn("whitespace-nowrap font-bold tabular-nums", line.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatPercent(line.margin)}</span> },
    { key: "potential", header: "Potansiyel Kâr", align: "right", hideBelow: "lg", cell: (line) => <span className="whitespace-nowrap font-bold tabular-nums text-navy-900">{formatTL(line.potential)}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Kâr özeti" className="grid gap-3 sm:grid-cols-2">
        <li>
          <StatCard icon={Wallet} tone="green" label="Toplam Potansiyel Kâr (mevcut stok)" value={formatTL(potentialProfit)} className="h-full" />
        </li>
        <li>
          <StatCard icon={Percent} tone="violet" label="Ortalama Kâr Marjı" value={formatPercent(avgMargin)} className="h-full" />
        </li>
      </ul>
      <Panel aria-label="Ürün kârlılığı">
        <PanelHeader title="Ürün Kârlılığı" subtitle="Maliyeti buradan güncelleyebilirsin; Enter veya alandan çıkınca kaydedilir. Maliyet, ürüne girilen kargo/paketleme/ödeme/diğer giderleri de içerir. Müşteri maliyeti görmez." />
        <DataTable
          caption="Ürün kârlılığı"
          columns={columns}
          rows={lines}
          getRowId={(line) => line.product.id}
          minWidth={620}
          empty={
            <EmptyState
              compact
              icon={BarChart3}
              title="Henüz ürün yok"
              description="Ürün eklediğinde kâr analizi burada oluşur."
              action={
                <Link href={sellerHref.newProduct} className={linkButtonClass("primary")}>
                  Ürün Ekle
                </Link>
              }
            />
          }
        />
      </Panel>
    </div>
  );
}

function InventoryTab() {
  const { products, stockRows } = useSellerWorkspace();
  const totalStock = products.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
  const value = products.reduce((sum, product) => sum + product.price * Math.max(0, product.stock), 0);
  const low = stockRows.filter((row) => row.status === "critical").length;
  const out = stockRows.filter((row) => row.status === "out").length;
  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Envanter özeti" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <li>
          <StatCard icon={Boxes} tone="violet" label="Ürün Sayısı" value={formatInteger(products.length)} className="h-full" />
        </li>
        <li>
          <StatCard icon={Boxes} tone="blue" label="Toplam Stok" value={`${formatInteger(totalStock)} adet`} className="h-full" />
        </li>
        <li>
          <StatCard icon={Boxes} tone="amber" label="Kritik / Tükenen" value={`${low} / ${out}`} className="h-full" />
        </li>
        <li>
          <StatCard icon={Wallet} tone="green" label="Envanter Değeri" value={formatTL(value)} note="Satış fiyatı × stok" className="h-full" />
        </li>
      </ul>
      <div>
        <Link href={sellerHref.stock} className={linkButtonClass("secondary")}>
          Stok Yönetimine Git
        </Link>
      </div>
    </div>
  );
}

/** Analizler: satış grafiği, kâr analizi (eski Kâr Analizi korunur) ve envanter raporu (eski Finans/Raporlar). */
export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("satis");
  return (
    <>
      <PageHeader title="Analizler" description="Satışlarını, kârlılığını ve envanterini tek yerden analiz et." />
      <div className="mb-5">
        <Tabs
          label="Analiz bölümleri"
          value={tab}
          onChange={setTab}
          items={[
            { key: "satis", label: "Satış" },
            { key: "kar", label: "Kâr Analizi" },
            { key: "envanter", label: "Envanter" },
          ]}
        />
      </div>
      {tab === "satis" ? <SalesTab /> : null}
      {tab === "kar" ? <ProfitTab /> : null}
      {tab === "envanter" ? <InventoryTab /> : null}
    </>
  );
}
