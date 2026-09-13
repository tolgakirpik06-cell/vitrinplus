"use client";

import { useCart } from "./CartProvider";

export function CartBadge({ className = "" }: { className?: string }) {
  const { count } = useCart();

  if (count <= 0) return null;

  return (
    <span
      className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
