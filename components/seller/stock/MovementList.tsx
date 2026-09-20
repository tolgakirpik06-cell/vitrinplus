import { cn } from "@/lib/utils";
import { formatCompactDateTime, formatInteger } from "@/lib/format";
import type { StockMovement } from "@/lib/seller-ops";

/** Stok hareketi listesi: + giriş (yeşil), − çıkış (kırmızı). İşaret metinde de vardır. */
export function MovementList({ movements, productNames, limit, emptyText = "Henüz stok hareketi yok." }: { movements: StockMovement[]; productNames?: ReadonlyMap<string, string>; limit?: number; emptyText?: string }) {
  const items = limit ? movements.slice(0, limit) : movements;
  if (items.length === 0) return <p className="py-4 text-center text-xs text-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-line/80">
      {items.map((movement) => (
        <li key={movement.id} className="flex items-center gap-3 py-2 text-[12.5px]">
          <span className={cn("w-10 shrink-0 text-right font-bold tabular-nums", movement.delta > 0 ? "text-emerald-600" : "text-rose-600")}>
            {movement.delta > 0 ? "+" : "−"}
            {formatInteger(Math.abs(movement.delta))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-navy-800">{movement.reason}</span>
            {productNames ? <span className="block truncate text-[11px] text-muted">{productNames.get(movement.productId) ?? "Silinmiş ürün"}</span> : null}
          </span>
          <span className="shrink-0 text-[11px] text-muted">{formatCompactDateTime(movement.at)}</span>
        </li>
      ))}
    </ul>
  );
}
