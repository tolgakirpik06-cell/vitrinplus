"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { ProductCard } from "@/components/home/ProductCard";
import { useDemo } from "@/components/demo/DemoProvider";
import type { Product } from "@/types";

export function FavoritesPageClient() {
  const { resolveProduct } = useDemo();
  const { slugs } = useFavorites();

  const favorites = slugs
    .map((slug) => resolveProduct(slug))
    .filter((product): product is Product => Boolean(product));

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Heart size={20} className={favorites.length > 0 ? "fill-rose-500" : undefined} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Favorilerim</h1>
          <p className="mt-1 text-sm text-navy-400">{favorites.length} ürün favorilerinde</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy-100 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
            <Heart size={26} />
          </span>
          <div>
            <p className="text-sm font-bold text-navy-900">Henüz favori ürünün yok</p>
            <p className="mt-1 text-xs text-navy-400">
              Beğendiğin ürünlerin üzerindeki kalp ikonuna dokunarak buraya ekleyebilirsin.
            </p>
          </div>
          <Link
            href="/"
            className="mt-1 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.55)] transition-colors hover:bg-brand-600"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
