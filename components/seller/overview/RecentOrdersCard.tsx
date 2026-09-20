"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { formatCompactDateTime, formatTL } from "@/lib/format";
import type { SellerOrderRow } from "@/lib/seller-analytics";
import { OrderStatusBadge } from "@/components/seller/OrderStatusBadge";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

const columns: Column<SellerOrderRow>[] = [
  { key: "id", header: "Sipariş No", cell: (row) => <span className="font-semibold text-navy-900">#{row.order.id}</span> },
  {
    key: "product",
    header: "Ürün",
    cell: (row) => (
      <span className="block max-w-[200px] truncate text-navy-700">
        {row.items[0]?.name ?? "—"}
        {row.items.length > 1 ? <span className="text-muted"> +{row.items.length - 1}</span> : null}
      </span>
    ),
  },
  { key: "customer", header: "Müşteri", hideBelow: "md", cell: (row) => <span className="text-navy-700">{row.customer.name}</span> },
  { key: "amount", header: "Tutar", align: "right", cell: (row) => <span className="font-semibold tabular-nums text-navy-900">{formatTL(row.amount)}</span> },
  { key: "status", header: "Durum", cell: (row) => <OrderStatusBadge status={row.ui} /> },
  { key: "date", header: "Tarih", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatCompactDateTime(row.order.createdAt)}</span> },
];

export function RecentOrdersCard() {
  const router = useRouter();
  const { rows } = useSellerWorkspace();
  const latest = rows.slice(0, 5);
  return (
    <Panel aria-label="Son siparişler" className="min-w-0">
      <PanelHeader
        title="Son Siparişler"
        action={
          <Link href={sellerHref.orders} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
            Tümünü Gör <ArrowRight size={13} aria-hidden />
          </Link>
        }
      />
      <DataTable
        caption="Son siparişler"
        columns={columns}
        rows={latest}
        getRowId={(row) => row.order.id}
        minWidth={520}
        onRowClick={(row) => router.push(`${sellerHref.orders}?siparis=${encodeURIComponent(row.order.id)}`)}
        empty={<EmptyState compact icon={ShoppingBag} title="Henüz sipariş yok" description="Müşteriler ürünlerini satın aldığında siparişler burada görünür." />}
      />
    </Panel>
  );
}
