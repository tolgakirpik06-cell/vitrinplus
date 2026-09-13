import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Product, ProductRowConfig, ProductRowAccent } from "@/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

const accentClasses: Record<ProductRowAccent, string> = {
  brand: "bg-brand-50 text-brand-500",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
};

const MAX_ITEMS = 6;

export function ProductRow({
  config,
  products,
}: {
  config: ProductRowConfig;
  products: Product[];
}) {
  const items = products.filter((product) => product.tags.includes(config.tag)).slice(0, MAX_ITEMS);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby={`${config.id}-baslik`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id={`${config.id}-baslik`}
          className="flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl"
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accentClasses[config.accent])}>
            <config.icon size={16} />
          </span>
          <span>
            {config.title}
            {config.subtitle ? (
              <span className="ml-2 hidden text-xs font-normal text-navy-400 sm:inline">
                {config.subtitle}
              </span>
            ) : null}
          </span>
        </h2>
        <Link
          href="/kategoriler"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-500 transition-colors hover:text-brand-600"
        >
          Tümünü Gör
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            rank={config.showRank ? index + 1 : undefined}
          />
        ))}
      </div>
    </section>
  );
}
