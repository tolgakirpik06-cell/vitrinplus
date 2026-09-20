"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  /** Küçük ekranlarda sütunu gizler (tablo yine yatay kaydırılabilir). */
  hideBelow?: "md" | "lg" | "xl";
};

const hideClasses = { md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;
const alignClasses = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Yoğun veri tablosu (referanslardaki tablo yoğunluğu: ~48px satır, açık gri başlık).
 * Seçim, satır tıklama ve aktif satır vurgusu desteklenir. Mobilde yatay kaydırılır.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onRowClick,
  activeRowId,
  empty,
  minWidth = 900,
  rowLabel,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption: string;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleRow?: (id: string, checked: boolean) => void;
  onToggleAll?: (checked: boolean) => void;
  onRowClick?: (row: T) => void;
  activeRowId?: string | null;
  empty?: ReactNode;
  minWidth?: number;
  rowLabel?: (row: T) => string;
}) {
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds?.has(getRowId(row)));
  const someSelected = selectable && !allSelected && rows.some((row) => selectedIds?.has(getRowId(row)));

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-navy-50/70 text-left text-xs font-semibold text-muted">
            {selectable ? (
              <th scope="col" className="w-11 rounded-l-lg py-2.5 pl-3 pr-1">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) node.indeterminate = someSelected;
                  }}
                  onChange={(event) => onToggleAll?.(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-navy-200 accent-royal-600"
                />
              </th>
            ) : null}
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-3 py-2.5 font-semibold",
                  alignClasses[column.align ?? "left"],
                  column.hideBelow && hideClasses[column.hideBelow],
                  !selectable && index === 0 && "rounded-l-lg",
                  index === columns.length - 1 && "rounded-r-lg",
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/80">
          {rows.map((row) => {
            const id = getRowId(row);
            const selected = selectedIds?.has(id) ?? false;
            return (
              <tr
                key={id}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => onRowKeyDown(event, row) : undefined}
                aria-selected={selectable ? selected : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-royal-500",
                  activeRowId === id ? "bg-royal-50/70" : selected ? "bg-royal-50/40" : "hover:bg-navy-50/50"
                )}
              >
                {selectable ? (
                  <td className="w-11 py-2 pl-3 pr-1" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={rowLabel ? `${rowLabel(row)} seç` : "Satırı seç"}
                      checked={selected}
                      onChange={(event) => onToggleRow?.(id, event.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-navy-200 accent-royal-600"
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2.5 align-middle", alignClasses[column.align ?? "left"], column.hideBelow && hideClasses[column.hideBelow], column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? empty : null}
    </div>
  );
}
