"use client";

import { Sparkles, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { searchCatalog } from "@/lib/search";

type Size = "md" | "lg";

export function AiSearchBar({
  compact = false,
  size = "md",
  defaultValue = "",
  onNavigate,
}: {
  compact?: boolean;
  size?: Size;
  /** /arama sayfasında mevcut sorguyu göstermek için (server component'ten prop olarak gelir). */
  defaultValue?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const resultsId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const results = searchCatalog(query);
  const visible = open && query.trim().length > 0;
  const total = results.products.length + results.stores.length + results.categories.length;
  const isLg = size === "lg";

  function closeResults() {
    setOpen(false);
    onNavigate?.();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    closeResults();
    router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      className="relative flex w-full min-w-0 items-center gap-2.5"
      onSubmit={handleSubmit}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      role="search"
      aria-label="VitrinPlus ürün araması"
    >
      <div
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-full pl-5 pr-2 transition-all duration-200",
          isLg
            ? "h-14 border-2 border-transparent bg-white shadow-lg shadow-navy-950/20 focus-within:border-brand-300 sm:h-16 sm:pl-6"
            : "h-12 border border-navy-100 bg-white shadow-card focus-within:border-brand-300 focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.12)] lg:h-[3.25rem]"
        )}
      >
        <Search size={isLg ? 20 : 18} className="shrink-0 text-navy-300" aria-hidden />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && visible) {
              event.preventDefault();
              resultsRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
            }
          }}
          autoComplete="off"
          aria-controls={visible ? resultsId : undefined}
          type="text"
          placeholder="Ürün, kategori veya mağaza ara..."
          aria-label="Ürün, kategori veya mağaza ara"
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
              Örn: kablosuz kulaklık, TeknoMarket
            </span>
          </>
        ) : null}
      </div>
      <button
        type="submit"
        aria-label="Ara"
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full font-semibold text-white shadow-[0_10px_20px_-8px_rgba(124,58,237,0.55)] transition-all duration-200 hover:-translate-y-0.5",
          isLg
            ? "h-14 px-5 text-sm bg-brand-500 hover:bg-brand-600 sm:h-16 sm:px-7 sm:text-base"
            : "h-12 px-4 text-sm bg-brand-500 hover:bg-brand-600 sm:px-5 lg:h-[3.25rem]"
        )}
      >
        <Sparkles size={isLg ? 18 : 16} />
        <span className="hidden sm:inline">Ara</span>
      </button>
      {visible ? (
        <div
          id={resultsId}
          ref={resultsRef}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain rounded-2xl border border-navy-100 bg-white p-2 shadow-xl"
        >
          <p role="status" className="px-3 py-2 text-xs text-navy-500">
            {total ? `${results.products.length} ürün · ${results.stores.length} mağaza · ${results.categories.length} kategori` : "Sonuç bulunamadı. Farklı bir anahtar kelime deneyin."}
          </p>
          {results.products.slice(0, 6).map((product) => (
            <Link key={product.slug} href={`/urun/${product.slug}`} onClick={closeResults}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-brand-50 focus:bg-brand-50 focus:outline-none">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-navy-800">{product.name}</span>
                <span className="block truncate text-xs text-navy-500">{product.brand} · {product.seller}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-brand-600">{formatPrice(product.price)}</span>
            </Link>
          ))}
          {results.stores.slice(0, 2).map((store) => (
            <Link key={store.slug} href={`/magaza/${store.slug}`} onClick={closeResults}
              className="block rounded-xl px-3 py-2 text-sm text-navy-700 hover:bg-brand-50 focus:bg-brand-50">Mağaza: {store.name}</Link>
          ))}
          {results.categories.slice(0, 2).map((category) => (
            <Link key={category.slug} href={`/kategori/${category.slug}`} onClick={closeResults}
              className="block rounded-xl px-3 py-2 text-sm text-navy-700 hover:bg-brand-50 focus:bg-brand-50">Kategori: {category.name}</Link>
          ))}
          {total > 0 ? (
            <Link href={`/arama?q=${encodeURIComponent(query.trim())}`} onClick={closeResults}
              className="mt-1 block border-t border-navy-100 px-3 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50 focus:bg-brand-50">Tüm sonuçları gör</Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
