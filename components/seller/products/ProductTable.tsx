"use client";

import Link from "next/link";
import { AlertTriangle, Copy, MoreHorizontal, Pencil, Power, PowerOff, Rocket, Trash2, Boxes } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { DropdownMenu, type MenuItem } from "@/components/dashboard/DropdownMenu";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { formatInteger, formatSignedTL, formatTL } from "@/lib/format";
import { displayState, type ProductDisplayState, type ProductRow } from "@/lib/seller-products";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { sellerHref } from "@/components/seller/seller-nav";

const stateLabels: Record<ProductDisplayState, { label: string; tone: BadgeTone }> = {
  aktif: { label: "Aktif", tone: "success" },
  pasif: { label: "Pasif", tone: "neutral" },
  taslak: { label: "Taslak", tone: "brand" },
  stokyok: { label: "Stokta Yok", tone: "danger" },
};

export type ProductRowActions = {
  onDuplicate: (row: ProductRow) => void;
  onToggle: (row: ProductRow) => void;
  onDelete: (row: ProductRow) => void;
  onEdit: (row: ProductRow) => void;
  onStock: (row: ProductRow) => void;
};

function rowMenu(row: ProductRow, actions: ProductRowActions): MenuItem[] {
  const state = displayState(row);
  return [
    { key: "edit", label: "Düzenle", icon: Pencil, onSelect: () => actions.onEdit(row) },
    { key: "stock", label: "Stok Güncelle", icon: Boxes, onSelect: () => actions.onStock(row) },
    { key: "copy", label: "Kopyala", icon: Copy, onSelect: () => actions.onDuplicate(row) },
    {
      key: "toggle",
      label: state === "taslak" ? "Satışa Yayınla" : row.product.status === "pasif" ? "Aktifleştir" : "Pasife Al",
      icon: state === "taslak" ? Rocket : row.product.status === "pasif" ? Power : PowerOff,
      onSelect: () => actions.onToggle(row),
    },
    { key: "delete", label: "Sil", icon: Trash2, danger: true, separatorBefore: true, onSelect: () => actions.onDelete(row) },
  ];
}

export function ProductTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  actions,
  empty,
}: {
  rows: ProductRow[];
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  actions: ProductRowActions;
  empty: React.ReactNode;
}) {
  const columns: Column<ProductRow>[] = [
    {
      key: "product",
      header: "Ürün",
      className: "min-w-[220px]",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ProductThumb name={row.product.name} image={row.product.images?.[0]} size={44} />
          <div className="min-w-0">
            <Link href={`${sellerHref.products}/${encodeURIComponent(row.product.id)}`} className="block max-w-[210px] truncate font-semibold text-navy-900 hover:text-royal-700 focus-visible:outline-2 focus-visible:outline-royal-500">
              {row.product.name}
            </Link>
            <span className="block max-w-[210px] truncate text-xs text-muted">
              {[row.product.brand, row.product.model].filter(Boolean).join(" · ") || (row.product.variants?.length ? `${row.product.variants.length} varyant` : "—")}
            </span>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap text-xs text-navy-600">{row.product.sku || "—"}</span> },
    { key: "category", header: "Kategori", hideBelow: "lg", cell: (row) => <span className="block max-w-[120px] truncate text-xs text-navy-600">{row.product.category}</span> },
    { key: "price", header: "Satış Fiyatı", align: "right", cell: (row) => <span className="whitespace-nowrap font-bold tabular-nums text-navy-900">{row.product.price > 0 ? formatTL(row.product.price) : "—"}</span> },
    { key: "cost", header: "Maliyet", align: "right", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap tabular-nums text-navy-600">{row.unitCost > 0 ? formatTL(row.unitCost) : "—"}</span> },
    {
      key: "stock",
      header: "Stok",
      align: "right",
      cell: (row) => {
        const { status, sellable } = row.stock;
        return (
          <span className={status === "out" ? "font-bold tabular-nums text-rose-600" : status === "critical" ? "inline-flex items-center gap-1 font-bold tabular-nums text-amber-600" : "tabular-nums text-navy-800"}>
            {formatInteger(sellable)}
            {status === "critical" ? <AlertTriangle size={13} aria-label="Kritik stok" /> : null}
          </span>
        );
      },
    },
    { key: "sold", header: "Satış Adedi", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular-nums text-navy-700">{formatInteger(row.sold)}</span> },
    { key: "views", header: <span title="Demo tahmini değer">Görüntülenme</span>, align: "right", hideBelow: "xl", cell: (row) => <span className="tabular-nums text-navy-700">{formatInteger(row.views)}</span> },
    {
      key: "profit",
      header: "Tahmini Kâr",
      align: "right",
      hideBelow: "md",
      cell: (row) =>
        row.unitProfit === null ? (
          <span className="text-navy-300" title="Maliyet girilmediği için kâr hesaplanamaz">—</span>
        ) : (
          <span className={row.unitProfit >= 0 ? "whitespace-nowrap font-bold tabular-nums text-emerald-600" : "whitespace-nowrap font-bold tabular-nums text-rose-600"}>{formatSignedTL(row.unitProfit)}</span>
        ),
    },
    {
      key: "status",
      header: "Durum",
      cell: (row) => {
        const state = stateLabels[displayState(row)];
        return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (row) => (
        <DropdownMenu
          label={`${row.product.name} işlemleri`}
          trigger={<MoreHorizontal size={16} aria-hidden />}
          triggerClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-navy-500 hover:bg-navy-50 hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-royal-500"
          items={rowMenu(row, actions)}
        />
      ),
    },
  ];

  return (
    <DataTable
      caption="Ürün listesi"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.product.id}
      selectable
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      rowLabel={(row) => row.product.name}
      minWidth={940}
      empty={empty}
    />
  );
}
