import Link from "next/link";
import { ChevronRight, Store as StoreIcon } from "lucide-react";
import { stores } from "@/data/stores";
import { StoreCard } from "@/components/ui/StoreCard";

export function PopularStores() {
  const items = stores.slice(0, 8);

  return (
    <section aria-labelledby="populer-magazalar-baslik">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="populer-magazalar-baslik" className="flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy-600">
            <StoreIcon size={16} />
          </span>
          Popüler Mağazalar
        </h2>
        <Link
          href="/magazalar"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-500 transition-colors hover:text-brand-600"
        >
          Tümünü Gör
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </section>
  );
}
