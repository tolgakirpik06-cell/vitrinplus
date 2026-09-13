import Link from "next/link";
import { Package, Store, Truck, Zap } from "lucide-react";
import type { Product } from "@/types";
import { AiTagBadge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { ProductVisual, GenericCategoryVisual } from "@/components/ui/product-visuals";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { cn, formatPrice } from "@/lib/utils";

export function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  const ShippingIcon = product.shipping.variant === "fast" ? Zap : Truck;
  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;

  return (
    <Link
      href={`/urun/${product.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-navy-100/80 bg-white shadow-premium transition-all duration-300 hover:-translate-y-1.5 hover:border-navy-200 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-neutral-50 to-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(13,17,29,0.05),transparent_65%)]"
          aria-hidden
        />

        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          <AiTagBadge type={product.aiTag.type} label={product.aiTag.label} />
          {rank ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-navy-900 px-2 text-[11px] font-bold text-white shadow-sm">
              #{rank}
            </span>
          ) : discountPercent ? (
            <span className="flex h-6 items-center justify-center rounded-full bg-rose-600 px-2 text-[11px] font-bold text-white shadow-sm">
              %{discountPercent}
            </span>
          ) : null}
        </div>

        <FavoriteButton className="absolute right-3 top-3 z-10" />

        <div className="flex h-full w-full items-center justify-center p-6 transition-transform duration-500 ease-out group-hover:scale-[1.06]">
          {product.visual === "generic" ? (
            <GenericCategoryVisual
              icon={product.icon ?? Package}
              className="h-full w-full drop-shadow-[0_18px_20px_rgba(13,17,29,0.14)]"
            />
          ) : (
            <ProductVisual
              visual={product.visual}
              className="h-full w-full drop-shadow-[0_18px_20px_rgba(13,17,29,0.14)]"
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-navy-800 sm:text-[0.925rem]">
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-navy-900">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice ? (
              <span className="text-xs text-navy-300 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            ) : null}
          </span>
          <RatingStars rating={product.rating} />
        </div>

        <p className="text-xs text-navy-400">{product.reviewCount} değerlendirme</p>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-navy-50 pt-2.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              product.shipping.variant === "fast" ? "text-brand-600" : "text-emerald-600"
            )}
          >
            <ShippingIcon size={13} />
            {product.shipping.label}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1 text-navy-400">
            <Store size={13} className="shrink-0" />
            <span className="truncate">{product.seller}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
