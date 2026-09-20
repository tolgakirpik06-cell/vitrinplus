"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { DeltaBadge } from "@/components/dashboard/StatCard";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { COMMISSION_LABEL } from "@/lib/plans";
import { formatShortDate, formatTL } from "@/lib/format";
import { monthEarnings, pctChange } from "@/lib/seller-analytics";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

function Line({ label, value, negative, extra }: { label: string; value: number; negative?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 text-[13px] last:border-b-0">
      <span className="flex items-center gap-2 text-navy-600">
        {label}
        {extra}
      </span>
      <span className={negative && value > 0 ? "font-bold tabular-nums text-rose-600" : "font-bold tabular-nums text-navy-900"}>
        {negative && value > 0 ? "−" : ""}
        {formatTL(value)}
      </span>
    </div>
  );
}

/** Kazançlarım özeti: bu ay satış → kesintiler → net hakediş, sonraki ödeme. */
export function EarningsCard() {
  const { rows, now, payouts } = useSellerWorkspace();
  const { month, previous } = useMemo(() => {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    return { month: monthEarnings(rows, now), previous: monthEarnings(rows, previousMonth) };
  }, [rows, now]);

  return (
    <Panel aria-label="Kazançlarım">
      <PanelHeader
        title="Kazançlarım"
        action={
          <Link href={sellerHref.earnings} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
            Detaylı Rapor <ArrowRight size={13} aria-hidden />
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
        <div>
          <Line label="Bu ay satış" value={month.gross} />
          <Line label="İptaller / iadeler" value={month.returns} negative />
          <Line label="Ödeme hizmeti kesintisi" value={month.paymentFee} negative />
          <Line label="VitrinPlus satış komisyonu" value={month.commission} extra={<StatusBadge tone="success" dot={false}>{COMMISSION_LABEL.replace("satış ", "")}</StatusBadge>} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-royal-100 bg-royal-50/60 p-4">
            <p className="text-xs font-semibold text-navy-600">Net Hakediş</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none tracking-tight text-royal-700 tabular-nums">{formatTL(month.net)}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <DeltaBadge value={pctChange(month.net, previous.net)} />
              <span>geçen aya göre</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold text-muted">Sonraki ödeme</p>
              <p className="text-[13px] font-bold text-navy-900">{payouts.nextPayoutAt ? formatShortDate(payouts.nextPayoutAt.toISOString()) : "Henüz planlanmadı"}</p>
            </div>
            <p className="text-base font-extrabold tabular-nums text-navy-900">{formatTL(payouts.nextPayoutAmount)}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
