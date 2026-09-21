"use client";

import Link from "next/link";
import { Ban } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { OrderStatusBadge } from "@/components/seller/OrderStatusBadge";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";
import { formatCompactDateTime, formatTL } from "@/lib/format";
import { sumAmount, type SellerOrderRow } from "@/lib/seller-analytics";
import { SellerReturns } from "@/components/seller/pages/SellerReturns";

/**
 * İadeler: müşteri iade talepleri (onay / ret / teslim alma / iade edildi) gerçek kayıtlardır (SellerReturns).
 * Altında, iptal edilen siparişler ayrıca listelenir; iptal edilen siparişlerin stoğu otomatik geri yüklenir.
 */
export function ReturnsPage() {
  const { rows } = useSellerWorkspace();
  const cancelled = rows.filter((row) => row.ui === "iptal");

  const columns: Column<SellerOrderRow>[] = [
    {
      key: "id",
      header: "Sipariş No",
      cell: (row) => (
        <Link href={`${sellerHref.orders}?siparis=${encodeURIComponent(row.order.id)}`} className="font-bold text-royal-700 hover:text-royal-900 focus-visible:outline-2 focus-visible:outline-royal-500">
          #{row.order.id}
        </Link>
      ),
    },
    { key: "customer", header: "Müşteri", hideBelow: "md", cell: (row) => <span className="text-navy-800">{row.customer.name}</span> },
    { key: "items", header: "Ürünler", cell: (row) => <span className="block max-w-[240px] truncate text-navy-700">{row.items.map((item) => item.name).join(", ")}</span> },
    { key: "amount", header: "Tutar", align: "right", cell: (row) => <span className="whitespace-nowrap font-semibold tabular-nums text-navy-900">{formatTL(row.amount)}</span> },
    { key: "date", header: "Sipariş Tarihi", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-xs text-navy-600">{formatCompactDateTime(row.order.createdAt)}</span> },
    { key: "status", header: "Durum", cell: (row) => <OrderStatusBadge status={row.ui} /> },
  ];

  return (
    <>
      <PageHeader title="İadeler" description="Müşteri iade taleplerini yönet ve iptal edilen siparişlerini takip et." />
      <div className="flex flex-col gap-5">
        <SellerReturns />
        <ul aria-label="İptal özeti" className="grid gap-3 sm:grid-cols-2">
          <li>
            <StatCard icon={Ban} tone="rose" label="İptal Edilen Sipariş" value={cancelled.length} note={`Toplam ${formatTL(sumAmount(cancelled))}`} className="h-full" />
          </li>
        </ul>
        <Panel aria-label="İptal edilen siparişler">
          <PanelHeader title="İptal Edilen Siparişler" />
          <DataTable
            caption="İptal edilen siparişler"
            columns={columns}
            rows={cancelled}
            getRowId={(row) => row.order.id}
            minWidth={620}
            empty={<EmptyState compact icon={Ban} title="İptal edilen sipariş yok" description="Bir sipariş iptal edildiğinde burada listelenir." />}
          />
        </Panel>
      </div>
    </>
  );
}
