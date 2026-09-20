"use client";

import { AlertTriangle, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { DropdownMenu, type MenuItem } from "@/components/dashboard/DropdownMenu";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { cn } from "@/lib/utils";
import { formatInteger } from "@/lib/format";
import { formatDaysLeft, stockStatusLabels, type StockRow, type StockStatus } from "@/lib/seller-analytics";
import { daysTone, resolveEdit, type StockDraft, type StockEdits } from "@/lib/seller-stock";

const statusTones: Record<StockStatus, BadgeTone> = { out: "danger", critical: "warning", normal: "success", excess: "success" };

const daysClasses = { danger: "bg-rose-50 text-rose-600", success: "text-emerald-600", neutral: "text-navy-600" } as const;

function NumberCell({ value, label, invalid, changed, onChange }: { value: string; label: string; invalid: boolean; changed: boolean; onChange: (value: string) => void }) {
  return (
    // Alan içindeki tıklamalar satır tıklamasını (çekmece açma) tetiklemesin.
    <div onClick={(event) => event.stopPropagation()}>
      <input
        inputMode="numeric"
        value={value}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
        className={cn(
          "h-9 w-[76px] rounded-lg border bg-white px-2.5 text-[13px] font-medium tabular-nums text-navy-800 focus-visible:border-royal-400 focus-visible:outline-2 focus-visible:outline-royal-200",
          invalid ? "border-rose-400 bg-rose-50" : changed ? "border-royal-400 bg-royal-50/60" : "border-line"
        )}
      />
    </div>
  );
}

/** Stok tablosu: mevcut stok, düzenlenebilir yeni stok / kritik seviye, satış hızı ve tahmini tükenme günü. */
export function StockTable({
  rows,
  edits,
  selectedIds,
  activeId,
  onEdit,
  onToggleRow,
  onToggleAll,
  onOpen,
  menuFor,
  empty,
}: {
  rows: StockRow[];
  edits: StockEdits;
  selectedIds: ReadonlySet<string>;
  activeId: string | null;
  onEdit: (id: string, patch: StockDraft) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (row: StockRow) => void;
  menuFor: (row: StockRow) => MenuItem[];
  empty: ReactNode;
}) {
  const columns: Column<StockRow>[] = [
    {
      key: "product",
      header: "Ürün",
      className: "min-w-[200px]",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <ProductThumb name={row.product.name} image={row.product.images?.[0]} size={40} />
          <div className="min-w-0">
            <span className="block max-w-[170px] truncate font-semibold text-navy-900">{row.product.name}</span>
            {row.product.status && row.product.status !== "aktif" ? <span className="block text-xs text-muted">{row.product.status === "pasif" ? "Pasif" : "Taslak"}</span> : row.product.brand ? <span className="block max-w-[170px] truncate text-xs text-muted">{row.product.brand}</span> : null}
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap text-xs text-royal-700">{row.product.sku || "—"}</span> },
    {
      key: "variant",
      header: "Varyant",
      hideBelow: "xl",
      cell: (row) => {
        const variants = row.product.variants ?? [];
        return <span className="whitespace-nowrap text-xs text-navy-600">{variants.length === 0 ? "—" : variants.length === 1 ? variants[0].label : `${variants[0].label} +${variants.length - 1}`}</span>;
      },
    },
    {
      key: "stock",
      header: "Mevcut Stok",
      align: "center",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex min-w-9 items-center justify-center gap-1 rounded-md px-1.5 py-0.5 font-bold tabular-nums",
            row.status === "out" ? "bg-rose-50 text-rose-600" : row.status === "critical" ? "bg-amber-50 text-amber-600" : "text-navy-900"
          )}
        >
          {formatInteger(row.sellable)}
          {row.status === "critical" ? <AlertTriangle size={12} aria-label="Kritik stok" /> : null}
        </span>
      ),
    },
    {
      key: "newStock",
      header: "Yeni Stok",
      cell: (row) => {
        const edit = resolveEdit(row, edits[row.product.id]);
        return <NumberCell value={edit.stockText} label={`${row.product.name} yeni stok adedi`} invalid={Boolean(edit.errors.stock)} changed={edit.stock !== row.product.stock} onChange={(value) => onEdit(row.product.id, { stock: value })} />;
      },
    },
    {
      key: "threshold",
      header: "Kritik Seviye",
      hideBelow: "md",
      cell: (row) => {
        const edit = resolveEdit(row, edits[row.product.id]);
        return <NumberCell value={edit.thresholdText} label={`${row.product.name} kritik stok seviyesi`} invalid={Boolean(edit.errors.threshold)} changed={edit.threshold !== row.threshold} onChange={(value) => onEdit(row.product.id, { threshold: value })} />;
      },
    },
    { key: "sold30", header: "Son 30 Gün Satış", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular-nums text-royal-700">{formatInteger(row.sold30)}</span> },
    {
      key: "days",
      header: "Tahmini Kaç Gün?",
      hideBelow: "md",
      cell: (row) => <span className={cn("inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold", daysClasses[daysTone(row)])}>{formatDaysLeft(row)}</span>,
    },
    { key: "status", header: "Durum", cell: (row) => <StatusBadge tone={statusTones[row.status]}>{stockStatusLabels[row.status]}</StatusBadge> },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (row) => (
        <span onClick={(event) => event.stopPropagation()} className="inline-block">
          <DropdownMenu
            label={`${row.product.name} işlemleri`}
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
      caption="Stok listesi"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.product.id}
      selectable
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      onRowClick={onOpen}
      activeRowId={activeId}
      rowLabel={(row) => row.product.name}
      empty={empty}
      minWidth={960}
    />
  );
}
