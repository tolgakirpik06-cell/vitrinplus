import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Store as StoreIcon, LayoutGrid } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductCard } from "@/components/home/ProductCard";
import { StoreCard } from "@/components/ui/StoreCard";
import { products } from "@/data/products";
import { stores } from "@/data/stores";
import { mainCategories, extraCategories, categoryHref } from "@/data/categories";
import type { Product, Store } from "@/types";

type SearchParamsShape = { q?: string | string[] };

function norm(value: string): string {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function searchProducts(query: string): Product[] {
  const needle = norm(query);
  return products.filter((product) =>
    [product.name, product.brand, product.category, product.seller].some((field) =>
      norm(field).includes(needle)
    )
  );
}

function searchStores(query: string): Store[] {
  const needle = norm(query);
  return stores.filter(
    (store) => norm(store.name).includes(needle) || norm(store.categoryLabel).includes(needle)
  );
}

function searchCategories(query: string) {
  const needle = norm(query);
  const all = [
    ...mainCategories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    ...extraCategories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  ];
  return all.filter(
    (c) =>
      norm(c.name).includes(needle) ||
      mainCategories
        .find((m) => m.id === c.id)
        ?.subcategories.some((sub) => norm(sub).includes(needle))
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = firstValue(sp.q);
  return { title: q ? `"${q}" için arama sonuçları | VitrinPlus` : "Arama | VitrinPlus" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const q = firstValue(sp.q).trim();

  const matchedCategories = q ? searchCategories(q) : [];
  const matchedStores = q ? searchStores(q) : [];
  const matchedProducts = q ? searchProducts(q) : [];
  const hasAnyResult = matchedCategories.length > 0 || matchedStores.length > 0 || matchedProducts.length > 0;

  return (
    <>
      <Header searchQuery={q} />

      <main className="section-container flex flex-col gap-6 py-5 sm:py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Arama Sonuçları" }]} />

        {!q ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 py-20 text-center">
            <SearchX size={32} className="text-navy-300" />
            <p className="mt-3 text-sm font-semibold text-navy-700">Ne aramak istersin?</p>
            <p className="mt-1 max-w-sm text-xs text-navy-400">
              Ürün adı, marka, kategori veya mağaza adı yazarak arayabilirsin.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-extrabold text-navy-900 sm:text-2xl">
                &quot;{q}&quot; için sonuçlar
              </h1>
              <p className="mt-1 text-sm text-navy-400">
                {matchedProducts.length} ürün · {matchedStores.length} mağaza · {matchedCategories.length} kategori
              </p>
            </div>

            {!hasAnyResult ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 py-20 text-center">
                <SearchX size={32} className="text-navy-300" />
                <p className="mt-3 text-sm font-semibold text-navy-700">
                  &quot;{q}&quot; için sonuç bulunamadı
                </p>
                <p className="mt-1 max-w-sm text-xs text-navy-400">
                  Farklı bir anahtar kelime deneyebilir veya{" "}
                  <Link href="/kategoriler" className="font-semibold text-brand-600 hover:text-brand-700">
                    tüm kategorileri
                  </Link>{" "}
                  inceleyebilirsin.
                </p>
              </div>
            ) : (
              <>
                {matchedCategories.length > 0 ? (
                  <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
                      <LayoutGrid size={16} className="text-brand-500" />
                      Kategoriler
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {matchedCategories.map((category) => (
                        <Link
                          key={category.id}
                          href={categoryHref(category.slug)}
                          className="rounded-full border border-navy-100 bg-white px-4 py-2 text-xs font-semibold text-navy-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {matchedStores.length > 0 ? (
                  <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
                      <StoreIcon size={16} className="text-brand-500" />
                      Mağazalar
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {matchedStores.map((store) => (
                        <StoreCard key={store.id} store={store} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {matchedProducts.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-sm font-bold text-navy-900">
                      Ürünler <span className="font-normal text-navy-400">({matchedProducts.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                      {matchedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
