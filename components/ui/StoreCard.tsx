import Link from "next/link";
import { Star, BadgeCheck, Crown } from "lucide-react";
import type { Store } from "@/types";
import { cn } from "@/lib/utils";

const toneClasses: Record<Store["tone"], string> = {
  brand: "from-brand-500 to-brand-600",
  navy: "from-navy-700 to-navy-900",
  violet: "from-violet-500 to-violet-600",
  emerald: "from-emerald-500 to-emerald-600",
  sky: "from-sky-500 to-sky-600",
  rose: "from-rose-500 to-rose-600",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function StoreCard({ store, id }: { store: Store; id?: string }) {
  return (
    <Link
      id={id}
      href={`/magazalar#${store.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-navy-100/80 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-card-hover sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-extrabold text-white shadow-sm",
            toneClasses[store.tone]
          )}
        >
          {initials(store.name)}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-navy-900">{store.name}</span>
            {store.badge === "founder" ? (
              <Crown size={14} className="shrink-0 text-amber-500" aria-label="Kurucu Mağaza" />
            ) : store.badge === "verified" ? (
              <BadgeCheck size={14} className="shrink-0 text-brand-500" aria-label="Onaylı Mağaza" />
            ) : null}
          </span>
          <span className="block truncate text-xs text-navy-400">{store.categoryLabel}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-navy-400">
        <span className="inline-flex items-center gap-1 font-semibold text-navy-700">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          {store.rating.toFixed(1)}
        </span>
        <span>{store.productCount.toLocaleString("tr-TR")} ürün</span>
        <span>{store.followerCount} takipçi</span>
      </div>
    </Link>
  );
}
