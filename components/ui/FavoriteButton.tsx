"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/components/favorites/FavoritesProvider";

export function FavoriteButton({ slug, className }: { slug: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(slug);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(slug);
      }}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/95 text-navy-400 shadow-sm ring-1 ring-navy-100/80 backdrop-blur transition-colors hover:text-rose-500",
        active && "text-rose-500 ring-rose-200/80",
        className
      )}
    >
      <Heart size={15} className={cn(active && "fill-rose-500")} />
    </button>
  );
}
