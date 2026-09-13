"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductVisual } from "@/components/ui/product-visuals";
import { formatPrice, cn } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * Hero'nun sağ tarafındaki, gerçek ürünleri gösteren, kullanıcının oklarla
 * gezebildiği (otomatik oynatılmayan) küçük ürün vitrini. Her ürün
 * tıklanabilir ve doğru /urun/[slug] sayfasına gider; oklar ise ayrı
 * kontroller olarak ürünü değiştirir (Link'in içine alınmaz).
 */
export function HeroProductShowcase({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);

  if (products.length === 0) return null;
  const product = products[index];
  const visualKey = product.visual === "generic" ? "phone" : product.visual;

  function go(delta: number) {
    setIndex((current) => (current + delta + products.length) % products.length);
  }

  return (
    <div className="relative mx-auto w-full max-w-[18.5rem]">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Önceki ürün"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition-colors hover:bg-white/20"
        >
          <ChevronLeft size={16} />
        </button>

        <Link
          href={`/urun/${product.slug}`}
          className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
        >
          {product.discount ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              %{product.discount} indirim
            </span>
          ) : null}
          <span className="absolute right-3 top-3 z-10 inline-flex items-center rounded-full bg-brand-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            {product.aiTag.label}
          </span>

          <div className="relative mx-auto mt-3 aspect-square w-[72%] drop-shadow-[0_20px_24px_rgba(5,7,16,0.5)] transition-transform duration-300 group-hover:-translate-y-1">
            <ProductVisual visual={visualKey} className="h-full w-full" />
          </div>

          <p className="mt-3 line-clamp-1 text-xs font-semibold text-white/90">{product.name}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-extrabold text-white">{formatPrice(product.price)}</span>
            {product.oldPrice ? (
              <span className="text-xs text-white/40 line-through">{formatPrice(product.oldPrice)}</span>
            ) : null}
          </div>
        </Link>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Sonraki ürün"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition-colors hover:bg-white/20"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {products.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${item.name} ürününü göster`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-brand-400" : "w-1.5 bg-white/20 hover:bg-white/35"
            )}
          />
        ))}
      </div>
    </div>
  );
}
