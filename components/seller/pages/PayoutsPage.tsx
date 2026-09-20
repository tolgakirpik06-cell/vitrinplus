"use client";

import { Building2, CalendarClock, Wallet } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs } from "@/components/dashboard/Tabs";
import { EarningsTable, type EarningsFilter } from "@/components/seller/pages/EarningsTable";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { formatShortDate, formatTL } from "@/lib/format";
import { PAYOUT_DELAY_DAYS } from "@/lib/seller-analytics";

/** Ödemeler: hesaba aktarılan / planlanan ödemeler. Banka bilgisi alınmaz, gerçek aktarım yapılmaz. */
export function PayoutsPage() {
  const { rows, now, payouts } = useSellerWorkspace();
  const [filter, setFilter] = useState<Exclude<EarningsFilter, "teslim-bekleniyor">>("planli");

  return (
    <>
      <PageHeader title="Ödemeler" description="Hesabına aktarılan ve planlanan ödemelerini takip et." />
      <div className="flex flex-col gap-5">
        <ul aria-label="Ödeme özeti" className="grid gap-3 md:grid-cols-3">
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
          <li>
            <StatCard icon={Wallet} tone="amber" label="Bekleyen Ödeme" value={formatTL(payouts.pending)} note="Henüz aktarılmadı" className="h-full" />
          </li>
          <li>
            <StatCard icon={Wallet} tone="green" label="Aktarılan Toplam" value={formatTL(payouts.paidOut)} className="h-full" />
          </li>
        </ul>

        <Panel aria-label="Banka hesabı" className="flex items-start gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500">
            <Building2 size={19} />
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-navy-900">Banka Hesabı</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">Demo sürümünde IBAN bilgisi alınmaz ve gerçek bir ödeme aktarımı yapılmaz. Tutarlar, teslim edilen siparişlerin {PAYOUT_DELAY_DAYS} gün sonraki net hakedişinden hesaplanır.</p>
          </div>
        </Panel>

        <Panel aria-label="Ödeme listesi">
          <PanelHeader
            title="Ödeme Dökümü"
            action={
              <Tabs
                variant="segment"
                label="Ödeme durumu"
                value={filter}
                onChange={setFilter}
                items={[
                  { key: "planli", label: "Planlanan" },
                  { key: "aktarildi", label: "Aktarılan" },
                  { key: "hepsi", label: "Tümü" },
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
