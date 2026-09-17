"use client";

import { useFavorites } from "./FavoritesProvider";

export function FavoriteBadge({ className = "" }: { className?: string }) {
  const { count } = useFavorites();

  if (count <= 0) return null;

  return (
    <span
      className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
