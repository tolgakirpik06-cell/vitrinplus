import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ProductCard } from "@/components/home/ProductCard";
import { findCategoryBySlug, categoryHref } from "@/data/categories";
import { generateCategoryProducts, getCategoryCatalog } from "@/lib/mock-catalog";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const PAGE_SIZE = 12;

type SortKey = "onerilen" | "fiyat-artan" | "fiyat-azalan" | "puan";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "onerilen", label: "Önerilen" },
  { key: "fiyat-artan", label: "Fiyat: Düşükten Yükseğe" },
  { key: "fiyat-azalan", label: "Fiyat: Yüksekten Düşüğe" },
  { key: "puan", label: "En Çok Değerlendirilen" },
];

type SearchParamsShape = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function subcategoryKeywords(sub: string): string[] {
  return sub
    .toLowerCase()
    .split(/[&/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildQuery(current: SearchParamsShape, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = {
    alt: firstValue(current.alt),
    marka: firstValue(current.marka),
    fiyat: firstValue(current.fiyat),
    sirala: firstValue(current.sirala),
    sayfa: firstValue(current.sayfa),
    ...overrides,
  };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function priceBuckets(min: number, max: number): { label: string; value: string }[] {
  const span = max - min;
  const step = Math.max(Math.round(span / 4 / 10) * 10, 10);
  const b1 = min + step;
  const b2 = min + step * 2;
  const b3 = min + step * 3;
  const fmt = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} TL`;
  return [
    { label: `${fmt(min)} - ${fmt(b1)}`, value: `${min}-${b1}` },
    { label: `${fmt(b1)} - ${fmt(b2)}`, value: `${b1}-${b2}` },
    { label: `${fmt(b2)} - ${fmt(b3)}`, value: `${b2}-${b3}` },
    { label: `${fmt(b3)} ve üzeri`, value: `${b3}-` },
  ];
}

function applyFilters(
  products: Product[],
  filters: { alt?: string; marka?: string; fiyat?: string }
): Product[] {
  let result = products;

  if (filters.marka) {
    const needle = filters.marka.toLowerCase();
    result = result.filter((p) => p.seller.toLowerCase().includes(needle));
  }

  if (filters.alt) {
    const keywords = subcategoryKeywords(filters.alt);
    const matched = result.filter((p) => keywords.some((k) => p.name.toLowerCase().includes(k)));
    if (matched.length > 0) result = matched;
  }

  if (filters.fiyat) {
    const [minRaw, maxRaw] = filters.fiyat.split("-");
    const min = Number(minRaw) || 0;
    const max = maxRaw ? Number(maxRaw) : Infinity;
    const matched = result.filter((p) => p.price >= min && p.price <= max);
    if (matched.length > 0) result = matched;
  }

  return result;
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  if (sort === "fiyat-artan") return copy.sort((a, b) => a.price - b.price);
  if (sort === "fiyat-azalan") return copy.sort((a, b) => b.price - a.price);
  if (sort === "puan") return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  return copy;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = findCategoryBySlug(slug);
  return { title: found ? `${found.category.name} | PazarBuy` : "Kategori | PazarBuy" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParamsShape>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const found = findCategoryBySlug(slug);

  if (!found) {
    return (
      <>
        <Header />
        <ComingSoon
          title="Bu kategori bulunamadı"
          description="Aradığın kategori kaldırılmış olabilir. Tüm kategorileri ana sayfadan inceleyebilirsin."
        />
        <Footer />
      </>
    );
  }

  const { category } = found;
  const catalog = getCategoryCatalog(slug);
  const allProducts = generateCategoryProducts(slug);

  const alt = firstValue(sp.alt);
  const marka = firstValue(sp.marka);
  const fiyat = firstValue(sp.fiyat);
  const sirala = (firstValue(sp.sirala) as SortKey | undefined) ?? "onerilen";
  const page = Math.max(1, Number(firstValue(sp.sayfa)) || 1);

  const filtered = sortProducts(applyFilters(allProducts, { alt, marka, fiyat }), sirala);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const subcategories = "subcategories" in category ? category.subcategories : [];
  const brands = catalog?.brands ?? [];
  const buckets = catalog ? priceBuckets(catalog.priceRange[0], catalog.priceRange[1]) : [];

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-5 py-5 sm:py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: category.name }]} />

        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{category.name}</h1>
          <p className="mt-1.5 text-sm text-navy-400">{filtered.length} ürün bulundu</p>
        </div>

        {subcategories.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Link
              href={categoryHref(slug)}
              className={cn(
                "flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                !alt ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100 bg-white text-navy-600 hover:border-navy-300"
              )}
            >
              Tümü
            </Link>
            {subcategories.map((sub) => (
              <Link
                key={sub}
                href={`${categoryHref(slug)}${buildQuery(sp, { alt: sub, sayfa: undefined })}`}
                className={cn(
                  "flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  alt === sub ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100 bg-white text-navy-600 hover:border-navy-300"
                )}
              >
                {sub}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24 flex flex-col gap-5 rounded-2xl border border-navy-100/70 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <SlidersHorizontal size={15} className="text-navy-400" />
                Filtrele
              </p>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Fiyat Aralığı</p>
                <div className="flex flex-col gap-1.5">
                  {buckets.map((bucket) => (
                    <Link
                      key={bucket.value}
                      href={`${categoryHref(slug)}${buildQuery(sp, {
                        fiyat: fiyat === bucket.value ? undefined : bucket.value,
                        sayfa: undefined,
                      })}`}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        fiyat === bucket.value ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
                      )}
                    >
                      {bucket.label}
                    </Link>
                  ))}
                </div>
              </div>

              {brands.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Marka</p>
                  <div className="flex flex-col gap-1.5">
                    {brands.map((brand) => (
                      <Link
                        key={brand}
                        href={`${categoryHref(slug)}${buildQuery(sp, {
                          marka: marka === brand ? undefined : brand,
                          sayfa: undefined,
                        })}`}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          marka === brand ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
                        )}
                      >
                        {brand}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {alt || marka || fiyat ? (
                <Link href={categoryHref(slug)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Filtreleri Temizle
                </Link>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-navy-400 lg:hidden">{filtered.length} ürün</p>
              <div className="ml-auto flex items-center gap-1 overflow-x-auto">
                <ArrowUpDown size={13} className="mr-1 hidden shrink-0 text-navy-300 sm:block" />
                {SORT_OPTIONS.map((option) => (
                  <Link
                    key={option.key}
                    href={`${categoryHref(slug)}${buildQuery(sp, {
                      sirala: option.key === "onerilen" ? undefined : option.key,
                      sayfa: undefined,
                    })}`}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      sirala === option.key ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50"
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            {pageItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {pageItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 py-16 text-center">
                <p className="text-sm font-semibold text-navy-700">Bu filtrelerle ürün bulunamadı</p>
                <Link href={categoryHref(slug)} className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Filtreleri temizle
                </Link>
              </div>
            )}

            {totalPages > 1 ? (
              <nav aria-label="Sayfalama" className="mt-7 flex items-center justify-center gap-1.5">
                <Link
                  href={`${categoryHref(slug)}${buildQuery(sp, { sayfa: String(Math.max(1, currentPage - 1)) })}`}
                  aria-disabled={currentPage === 1}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:bg-navy-50",
                    currentPage === 1 && "pointer-events-none opacity-40"
                  )}
                >
                  <ChevronLeft size={16} />
                </Link>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`${categoryHref(slug)}${buildQuery(sp, { sayfa: String(p) })}`}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      p === currentPage ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50"
                    )}
                  >
                    {p}
                  </Link>
                ))}
                <Link
                  href={`${categoryHref(slug)}${buildQuery(sp, { sayfa: String(Math.min(totalPages, currentPage + 1)) })}`}
                  aria-disabled={currentPage === totalPages}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:bg-navy-50",
                    currentPage === totalPages && "pointer-events-none opacity-40"
                  )}
                >
                  <ChevronRight size={16} />
                </Link>
              </nav>
            ) : null}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
