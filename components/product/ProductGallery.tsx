"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  label: string;
  node: ReactNode;
};

export function ProductGallery({
  images,
  badge,
}: {
  images: GalleryImage[];
  badge?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-navy-100/80 bg-gradient-to-b from-neutral-50 to-white">
        {badge ? <div className="absolute left-4 top-4 z-10">{badge}</div> : null}
        <div className="flex h-full w-full items-center justify-center p-10">{current?.node}</div>
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2.5">
          {images.map((image, index) => (
            <button
              key={`${image.label}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={image.label}
              aria-pressed={active === index}
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-white p-2.5 transition-colors sm:h-20 sm:w-20",
                active === index
                  ? "border-brand-500 ring-2 ring-brand-100"
                  : "border-navy-100 hover:border-navy-300"
              )}
            >
              {image.node}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
