import { Star, BadgeCheck, Crown, MessageCircle } from "lucide-react";
import { stores } from "@/data/stores";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

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

export function SellerCard({
  sellerName,
  categoryLabel,
}: {
  sellerName: string;
  categoryLabel: string;
}) {
  const store = stores.find((s) => s.name === sellerName);

  const display = store ?? {
    name: sellerName,
    categoryLabel,
    rating: 4.5,
    productCount: 120,
    followerCount: "1K",
    tone: "navy" as const,
    badge: undefined,
    slug: undefined,
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-navy-100/80 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-extrabold text-white shadow-sm",
            toneClasses[display.tone]
          )}
        >
          {initials(display.name)}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-navy-900">{display.name}</span>
            {display.badge === "founder" ? (
              <Crown size={14} className="shrink-0 text-amber-500" aria-label="Kurucu Mağaza" />
            ) : display.badge === "verified" ? (
              <BadgeCheck size={14} className="shrink-0 text-brand-500" aria-label="Onaylı Mağaza" />
            ) : null}
          </span>
          <span className="block truncate text-xs text-navy-400">{display.categoryLabel}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-navy-400">
        <span className="inline-flex items-center gap-1 font-semibold text-navy-700">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          {display.rating.toFixed(1)}
        </span>
        <span>{display.productCount.toLocaleString("tr-TR")} ürün</span>
        <span>{display.followerCount} takipçi</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          href={store ? `/magazalar#${store.slug}` : "/magazalar"}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Mağazaya Git
        </Button>
        <Button type="button" variant="ghost" size="sm" className="flex-1">
          <MessageCircle size={14} />
          Satıcıya Sor
        </Button>
      </div>
    </div>
  );
}
