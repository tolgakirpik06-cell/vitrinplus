"use client";

import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { DropdownMenu, type MenuItem } from "@/components/dashboard/DropdownMenu";
import { OrderStatusBadge } from "@/components/seller/OrderStatusBadge";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { formatCompactDateTime, formatInteger, formatSignedTL, formatTL } from "@/lib/format";
import type { SellerOrderRow } from "@/lib/seller-analytics";

/** Tablo satırı: yalnızca görünüm. Menü öğeleri ve seçim üst bileşenden gelir. */
export function OrderTable({
  rows,
  images,
  selectedIds,
  activeId,
  onToggleRow,
  onToggleAll,
  onOpen,
  menuFor,
  empty,
}: {
  rows: SellerOrderRow[];
  /** Ürün slug'ı → ilk görsel. */
  images: ReadonlyMap<string, string | undefined>;
  selectedIds: ReadonlySet<string>;
  activeId: string | null;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (row: SellerOrderRow) => void;
  menuFor: (row: SellerOrderRow) => MenuItem[];
  empty: ReactNode;
}) {
  const columns: Column<SellerOrderRow>[] = [
    {
      key: "id",
      header: "Sipariş No",
      cell: (row) => <span className="whitespace-nowrap font-bold text-royal-700">#{row.order.id}</span>,
    },
    {
      key: "items",
      header: "Ürünler",
      className: "min-w-[200px]",
      cell: (row) => {
        const first = row.items[0];
        return (
          <div className="flex items-center gap-2.5">
            <ProductThumb name={first.name} image={images.get(first.slug)} size={40} />
            <div className="min-w-0">
              <span className="block max-w-[180px] truncate font-medium text-navy-900">{first.name}</span>
              {row.items.length > 1 ? <span className="block text-xs text-muted">+{row.items.length - 1} ürün daha</span> : first.variantLabel ? <span className="block max-w-[180px] truncate text-xs text-muted">{first.variantLabel}</span> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Müşteri",
      hideBelow: "md",
      cell: (row) => (
        <div className="min-w-0">
          <span className="block max-w-[140px] truncate font-medium text-navy-800">{row.customer.name}</span>
          <span className="block max-w-[140px] truncate text-xs text-muted">{row.customer.city ?? "—"}</span>
        </div>
      ),
    },
    { key: "qty", header: "Adet", align: "center", hideBelow: "lg", cell: (row) => <span className="tabular-nums text-navy-700">{formatInteger(row.quantity)}</span> },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <span className="block font-bold tabular-nums text-navy-900">{formatTL(row.amount)}</span>
          <span className="block text-xs text-muted">{row.paymentMethod}</span>
        </div>
      ),
    },
    { key: "carrier", header: "Kargo Firması", hideBelow: "xl", cell: (row) => <span className="whitespace-nowrap text-[13px] font-semibold text-navy-700">{row.carrier}</span> },
    { key: "status", header: "Durum", cell: (row) => <OrderStatusBadge status={row.ui} /> },
    {
      key: "profit",
      header: "Tahmini Kâr",
      align: "right",
      hideBelow: "lg",
      cell: (row) =>
        row.ui === "iptal" || row.estimatedProfit === null ? (
          <span className="text-navy-300" title={row.ui === "iptal" ? "İptal edilen siparişte kâr yok" : "Ürün maliyeti girilmediği için kâr hesaplanamaz"}>
            —
          </span>
        ) : (
          <span className={row.estimatedProfit >= 0 ? "whitespace-nowrap font-bold tabular-nums text-emerald-600" : "whitespace-nowrap font-bold tabular-nums text-rose-600"}>{formatSignedTL(row.estimatedProfit)}</span>
        ),
    },
    { key: "date", header: "Tarih", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap text-xs text-navy-600">{formatCompactDateTime(row.order.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (row) => (
        // Menü ve tetikleyici tıklamaları satır tıklamasını (çekmece açma) tetiklemesin.
        <span onClick={(event) => event.stopPropagation()} className="inline-block">
          <DropdownMenu
            label={`${row.order.id} işlemleri`}
            trigger={<MoreHorizontal size={16} aria-hidden />}
            triggerClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-navy-500 hover:bg-navy-50 hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-royal-500"
            items={menuFor(row)}
          />
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Sipariş listesi"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.order.id}
      selectable
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      onRowClick={onOpen}
      activeRowId={activeId}
      rowLabel={(row) => `Sipariş ${row.order.id}`}
      empty={empty}
      minWidth={880}
    />
  );
}
