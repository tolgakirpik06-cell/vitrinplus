"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const AUTOPLAY_MS = 4500;

/**
 * "Günün Öne Çıkanları" için kompakt, yatay kaydırmalı ürün karuseli.
 * Ek bir kütüphane eklemeden (package.json'da mevcut değil) native CSS
 * scroll-snap + basit bir setInterval ile: masaüstünde ok butonları,
 * ~4.5sn'de bir otomatik ilerleme, üzerine gelince duraklama, mobilde
 * dokunarak kaydırma ve bir sonraki kartın kısmen görünmesi ("peek").
 */
export function FeaturedCarousel({
  config,
  items,
}: {
  config: ProductRowConfig;
  items: Product[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const step = card ? card.offsetWidth + 14 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        // Sona gelince aniden başa sıçramak yerine yumuşak bir şekilde
        // başa dön — "sonsuz döngüde sıçrama olmasın" isteğini karşılar.
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByCards(1);
      }
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, items.length, scrollByCards]);

  if (items.length === 0) return null;

  return (
    <section
      id={config.id}
      className="scroll-mt-32"
      aria-labelledby={`${config.id}-baslik`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/kategoriler"
            className="flex items-center gap-1 text-sm font-semibold text-navy-500 transition-colors hover:text-brand-600"
          >
            Tümünü Gör
          </Link>
          <span className="mx-0.5 h-5 w-px bg-navy-100" aria-hidden />
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Önceki ürünler"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-600"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Sonraki ürünler"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth px-1 pb-1 sm:gap-4"
      >
        {items.map((product, index) => (
          <div
            key={product.id}
            data-carousel-card
            className="w-[45%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]"
          >
            <ProductCard product={product} rank={config.showRank ? index + 1 : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}
