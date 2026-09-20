"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Pagination, paginate } from "@/components/dashboard/Pagination";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { Wallet } from "lucide-react";
import { formatShortDate, formatTL } from "@/lib/format";
import { payoutState, type PayoutState, type SellerOrderRow } from "@/lib/seller-analytics";
import { sellerHref } from "@/components/seller/seller-nav";

const stateMeta: Record<PayoutState, { label: string; tone: BadgeTone }> = {
  "teslim-bekleniyor": { label: "Teslim bekleniyor", tone: "neutral" },
  planli: { label: "Ödeme planlandı", tone: "warning" },
  aktarildi: { label: "Aktarıldı", tone: "success" },
};

export type EarningsFilter = "hepsi" | PayoutState;

type Line = { row: SellerOrderRow; state: PayoutState; at: Date | null; net: number };

/** Sipariş bazlı hakediş listesi. Net = brüt − ödeme altyapısı kesintisi − komisyon (%0). */
export function EarningsTable({ rows, now, filter }: { rows: SellerOrderRow[]; now: Date; filter: EarningsFilter }) {
  const [page, setPage] = useState(1);
  const lines = useMemo<Line[]>(() => {
    const list: Line[] = [];
    for (const row of rows) {
      const info = payoutState(row, now);
      if (info) list.push({ row, ...info });
    }
    return list.filter((line) => filter === "hepsi" || line.state === filter);
  }, [rows, now, filter]);

  const columns: Column<Line>[] = [
    {
      key: "id",
      header: "Sipariş No",
      cell: (line) => (
        <Link href={`${sellerHref.orders}?siparis=${encodeURIComponent(line.row.order.id)}`} className="whitespace-nowrap font-bold text-royal-700 hover:text-royal-900 focus-visible:outline-2 focus-visible:outline-royal-500">
          #{line.row.order.id}
        </Link>
      ),
    },
    { key: "date", header: "Sipariş Tarihi", hideBelow: "md", cell: (line) => <span className="whitespace-nowrap text-xs text-navy-600">{formatShortDate(line.row.order.createdAt)}</span> },
    { key: "gross", header: "Brüt Tutar", align: "right", cell: (line) => <span className="whitespace-nowrap tabular-nums text-navy-800">{formatTL(line.row.amount)}</span> },
    { key: "fee", header: "Kesinti", align: "right", hideBelow: "md", cell: (line) => <span className="whitespace-nowrap tabular-nums text-rose-600">−{formatTL(line.row.amount - line.net)}</span> },
    { key: "net", header: "Net Hakediş", align: "right", cell: (line) => <span className="whitespace-nowrap font-bold tabular-nums text-emerald-600">{formatTL(line.net)}</span> },
    { key: "pay", header: "Ödeme Tarihi", hideBelow: "lg", cell: (line) => <span className="whitespace-nowrap text-xs text-navy-600">{line.at ? formatShortDate(line.at.toISOString()) : "—"}</span> },
    { key: "state", header: "Durum", cell: (line) => <StatusBadge tone={stateMeta[line.state].tone}>{stateMeta[line.state].label}</StatusBadge> },
  ];

  return (
    <>
      <DataTable
        caption="Sipariş bazlı hakediş listesi"
        columns={columns}
        rows={paginate(lines, page, 10)}
        getRowId={(line) => line.row.order.id}
        minWidth={640}
        empty={<EmptyState compact icon={Wallet} title="Bu görünümde kayıt yok" description="Sipariş aldıkça ve teslim ettikçe hakedişlerin burada listelenir." />}
      />
      {lines.length > 0 ? <Pagination page={page} pageSize={10} total={lines.length} onPageChange={setPage} itemLabel="sipariş" /> : null}
    </>
  );
}
