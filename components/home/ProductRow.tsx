import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Product, ProductRowConfig, ProductRowAccent } from "@/types";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/lib/icon-map";
import { ProductCard } from "./ProductCard";

const accentClasses: Record<ProductRowAccent, string> = {
  brand: "bg-brand-50 text-brand-500",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
};

/**
 * `items`, çağıran sayfa tarafından `lib/product-rows.ts`'teki
 * `selectRowProducts()` ile ÖNCEDEN seçilmiş ürün listesidir — böylece
 * art arda gelen satırlar arasında hangi ürünlerin zaten gösterildiği
 * takip edilebilir (bkz. madde 11: "aynı ürün art arda tekrar etmesin").
 */
export function ProductRow({
  config,
  items,
}: {
  config: ProductRowConfig;
  items: Product[];
}) {
  if (items.length === 0) return null;

  const RowIcon = ICON_MAP[config.icon];

  return (
    // scroll-mt: kampanya/anchor linkleriyle bu bölüme atlandığında (örn.
    // "Süper Fırsatlar" kampanya kartı) başlık, sticky header + kategori
    // barının arkasında kalmasın (madde 18).
    <section id={config.id} className="scroll-mt-32" aria-labelledby={`${config.id}-baslik`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id={`${config.id}-baslik`}
          className="flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl"
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accentClasses[config.accent])}>
            <RowIcon size={16} />
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

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
