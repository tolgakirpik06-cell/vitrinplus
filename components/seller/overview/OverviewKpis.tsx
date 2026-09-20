"use client";

import { CreditCard, Eye, Percent, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatInteger, formatPercent, formatShortDate, formatTL } from "@/lib/format";
import { netEarning, pctChange, simulatedVisitors, summarizeDay } from "@/lib/seller-analytics";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

const DAY_MS = 86_400_000;

/** Genel Bakış KPI satırı: Ciro, Sipariş, Net Hakediş, Bekleyen Ödeme, Ziyaretçi, Dönüşüm. */
export function OverviewKpis() {
  const { rows, now, shop, products, payouts } = useSellerWorkspace();
  const kpi = useMemo(() => {
    const yesterday = new Date(now.getTime() - DAY_MS);
    const today = summarizeDay(rows, now);
    const before = summarizeDay(rows, yesterday);
    const visitors = simulatedVisitors(shop.reference, now, today.orders, products.length);
    const visitorsBefore = simulatedVisitors(shop.reference, yesterday, before.orders, products.length);
    const conversion = visitors > 0 ? (today.orders / visitors) * 100 : 0;
    const conversionBefore = visitorsBefore > 0 ? (before.orders / visitorsBefore) * 100 : 0;
    return { today, before, visitors, visitorsBefore, conversion, conversionBefore };
  }, [rows, now, shop.reference, products.length]);

  const demoBadge = <StatusBadge tone="neutral" dot={false} className="!px-1.5 !py-0.5 !text-[10px]">Demo veri</StatusBadge>;
  const noData = rows.length === 0;

  return (
    <section aria-label="Günlük özet" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        icon={TrendingUp}
        tone="green"
        label="Bugünkü Ciro"
        value={formatTL(kpi.today.revenue)}
        delta={pctChange(kpi.today.revenue, kpi.before.revenue)}
        note={`Dün: ${formatTL(kpi.before.revenue)}`}
      />
      <StatCard
        icon={ShoppingBag}
        tone="blue"
        label="Bugünkü Sipariş"
        value={formatInteger(kpi.today.orders)}
        delta={pctChange(kpi.today.orders, kpi.before.orders)}
        note={`Dün: ${formatInteger(kpi.before.orders)}`}
      />
      <StatCard
        icon={Wallet}
        tone="violet"
        label="Net Hakediş"
        value={formatTL(netEarning(kpi.today.revenue))}
        delta={pctChange(netEarning(kpi.today.revenue), netEarning(kpi.before.revenue))}
        note={`Dün: ${formatTL(netEarning(kpi.before.revenue))}`}
      />
      <StatCard
        icon={CreditCard}
        tone="amber"
        label="Bekleyen Ödeme"
        value={formatTL(payouts.pending)}
        note={payouts.nextPayoutAt ? `Sonraki ödeme: ${formatShortDate(payouts.nextPayoutAt.toISOString())}` : noData ? "Henüz ödeme yok" : "Teslimat sonrası hesaplanır"}
      />
      <StatCard
        icon={Eye}
        tone="teal"
        label="Ziyaretçi"
        badge={demoBadge}
        value={formatInteger(kpi.visitors)}
        delta={pctChange(kpi.visitors, kpi.visitorsBefore)}
        note={`Dün: ${formatInteger(kpi.visitorsBefore)}`}
      />
      <StatCard
        icon={Percent}
        tone="rose"
        label="Dönüşüm Oranı"
        badge={demoBadge}
        value={formatPercent(kpi.conversion)}
        delta={pctChange(kpi.conversion, kpi.conversionBefore)}
        note={`Dün: ${formatPercent(kpi.conversionBefore)}`}
      />
    </section>
  );
}
