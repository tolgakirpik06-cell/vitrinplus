"use client";

import { Sparkles, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Size = "md" | "lg";

export function AiSearchBar({
  compact = false,
  size = "md",
}: {
  compact?: boolean;
  size?: Size;
}) {
  const [query, setQuery] = useState("");
  const isLg = size === "lg";

  return (
    <form
      className="flex w-full items-center gap-2.5"
      onSubmit={(event) => event.preventDefault()}
      role="search"
      aria-label="VitrinPlus AI ürün araması"
    >
      <div
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-full pl-5 pr-2 transition-all duration-200",
          isLg
            ? "h-14 border-2 border-transparent bg-white shadow-lg shadow-navy-950/20 focus-within:border-brand-300 sm:h-16 sm:pl-6"
            : "h-12 border border-navy-100 bg-white shadow-card focus-within:border-brand-300 focus-within:shadow-[0_0_0_4px_rgba(255,106,18,0.1)] lg:h-[3.25rem]"
        )}
      >
        <Search size={isLg ? 20 : 18} className="shrink-0 text-navy-300" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="text"
          placeholder="Ne istediğini söyle..."
          className={cn(
            "h-full flex-1 min-w-0 bg-transparent text-navy-800 placeholder:text-navy-400 focus:outline-none",
            isLg ? "text-sm sm:text-base" : "text-sm"
          )}
        />
        {!compact ? (
          <>
            <span
              className={cn(
                "hidden h-5 w-px shrink-0 bg-navy-200",
                isLg ? "sm:block" : "xl:block"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "hidden shrink-0 whitespace-nowrap text-navy-400",
                isLg ? "sm:block text-xs sm:text-sm" : "xl:block text-xs"
              )}
            >
              Örn: 15 bin TL&apos;ye oyun bilgisayarı
            </span>
          </>
        ) : null}
      </div>
      <button
        type="submit"
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full font-semibold text-white shadow-[0_10px_20px_-8px_rgba(255,106,18,0.55)] transition-all duration-200 hover:-translate-y-0.5",
          isLg
            ? "h-14 px-5 text-sm bg-brand-500 hover:bg-brand-600 sm:h-16 sm:px-7 sm:text-base"
            : "h-12 px-4 text-sm bg-brand-500 hover:bg-brand-600 sm:px-5 lg:h-[3.25rem]"
        )}
      >
        <Sparkles size={isLg ? 18 : 16} />
        <span className="hidden sm:inline">AI&apos;ye Sor</span>
      </button>
    </form>
  );
}
