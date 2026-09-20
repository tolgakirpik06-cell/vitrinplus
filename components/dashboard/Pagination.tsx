"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= pageCount - 2) [pageCount - 1, pageCount - 2, pageCount - 3].forEach((value) => pages.add(value));
  const sorted = Array.from(pages).filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

const pageButton =
  "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:opacity-40";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = "kayıt",
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  return (
    <nav aria-label="Sayfalama" className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pt-4", className)}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Önceki sayfa"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className={cn(pageButton, "border-line bg-white text-navy-600 hover:bg-navy-50")}
        >
          <ChevronLeft size={15} aria-hidden />
        </button>
        {pageWindow(current, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} aria-hidden className="px-1 text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              aria-label={`Sayfa ${entry}`}
              aria-current={entry === current ? "page" : undefined}
              onClick={() => onPageChange(entry)}
              className={cn(pageButton, entry === current ? "border-royal-600 bg-royal-600 text-white shadow-royal" : "border-line bg-white text-navy-600 hover:bg-navy-50")}
            >
              {entry}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Sonraki sayfa"
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
          className={cn(pageButton, "border-line bg-white text-navy-600 hover:bg-navy-50")}
        >
          <ChevronRight size={15} aria-hidden />
        </button>
      </div>
      {onPageSizeChange ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="sr-only">Sayfa başına kayıt</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-lg border border-line bg-white px-2.5 text-xs font-semibold text-navy-700 focus-visible:outline-2 focus-visible:outline-royal-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {itemLabel} gösteriliyor.
        </label>
      ) : null}
      <p className="ml-auto text-xs text-muted">
        Toplam <span className="font-semibold text-navy-700 tabular-nums">{total.toLocaleString("tr-TR")}</span> {itemLabel}
      </p>
    </nav>
  );
}

/** Sayfa dilimi: 1 tabanlı sayfa numarasıyla diziyi keser. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return items.slice((current - 1) * pageSize, current * pageSize);
}
