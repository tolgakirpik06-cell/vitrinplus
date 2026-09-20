"use client";

import { Banknote, CalendarClock, HandCoins, Percent, ReceiptText, Wallet } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs } from "@/components/dashboard/Tabs";
import { EarningsTable, type EarningsFilter } from "@/components/seller/pages/EarningsTable";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { COMMISSION_LABEL } from "@/lib/plans";
import { formatShortDate, formatTL } from "@/lib/format";
import { PAYOUT_DELAY_DAYS, monthEarnings } from "@/lib/seller-analytics";
import { PAYMENT_FEE_RATE } from "@/lib/profit";

/** Kazançlarım: bu ayın brüt satışı, kesintiler ve net hakediş; sipariş bazlı döküm. Tüm tutarlar sipariş verisinden hesaplanır. */
export function EarningsPage() {
  const { rows, now, payouts } = useSellerWorkspace();
  const [filter, setFilter] = useState<EarningsFilter>("hepsi");
  const month = monthEarnings(rows, now);
  const monthName = now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Kazançlarım" description={`${monthName} için satış, kesinti ve net hakediş özetin. Tutarlar demo siparişlerinden hesaplanır.`} />
      <div className="flex flex-col gap-5">
        <ul aria-label="Bu ay kazanç özeti" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <li className="min-w-0">
            <StatCard icon={ReceiptText} tone="violet" label="Brüt Satış" value={formatTL(month.gross)} note={`${month.orderCount} sipariş`} className="h-full" />
          </li>
          <li className="min-w-0">
            <StatCard icon={Percent} tone="amber" label="Ödeme Altyapısı Kesintisi" value={formatTL(month.paymentFee)} note={`Demo oran: %${(PAYMENT_FEE_RATE * 100).toLocaleString("tr-TR")}`} className="h-full" />
          </li>
          <li className="min-w-0">
            <StatCard icon={HandCoins} tone="blue" label="VitrinPlus Komisyonu" value={formatTL(month.commission)} note={COMMISSION_LABEL} className="h-full" />
          </li>
          <li className="min-w-0">
            <StatCard icon={Wallet} tone="green" label="Net Hakediş" value={formatTL(month.net)} note="İptaller düşülmüş" className="h-full" />
          </li>
        </ul>

        <ul aria-label="Ödeme durumu" className="grid gap-3 md:grid-cols-3">
          <li>
            <StatCard icon={Banknote} tone="green" label="Aktarılan" value={formatTL(payouts.paidOut)} note="Hesabına aktarıldı sayılan tutar" className="h-full" />
          </li>
          <li>
            <StatCard icon={Wallet} tone="amber" label="Bekleyen Ödeme" value={formatTL(payouts.pending)} note="Teslim + bekleme süresi tamamlanınca" className="h-full" />
          </li>
          <li>
            <StatCard
              icon={CalendarClock}
              tone="violet"
              label="Sonraki Ödeme"
              value={payouts.nextPayoutAt ? formatTL(payouts.nextPayoutAmount) : "—"}
              note={payouts.nextPayoutAt ? formatShortDate(payouts.nextPayoutAt.toISOString()) : "Planlanmış ödeme yok"}
              className="h-full"
            />
          </li>
        </ul>

        <Panel aria-label="Hakediş dökümü">
          <PanelHeader
            title="Sipariş Bazlı Hakediş"
            subtitle={`Demo kuralı: teslimden ${PAYOUT_DELAY_DAYS} gün sonra aktarılır. Gerçek ödeme aktarımı bağlı değildir.`}
            action={
              <Tabs
                variant="segment"
                label="Ödeme durumu"
                value={filter}
                onChange={setFilter}
                items={[
                  { key: "hepsi", label: "Tümü" },
                  { key: "teslim-bekleniyor", label: "Teslim Bekleyen" },
                  { key: "planli", label: "Planlanan" },
                  { key: "aktarildi", label: "Aktarılan" },
                ]}
              />
            }
          />
          <EarningsTable key={filter} rows={rows} now={now} filter={filter} />
        </Panel>
      </div>
    </>
  );
}
