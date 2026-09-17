import type { Metadata } from "next";
import { Star, BadgeCheck, Crown, Package, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ProductCard } from "@/components/home/ProductCard";
import { stores } from "@/data/stores";
import { products as curatedProducts } from "@/data/products";
import { generateCategoryProducts } from "@/lib/mock-catalog";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

const toneClasses: Record<Store["tone"], string> = {
  brand: "from-brand-500 to-brand-600",
  navy: "from-navy-700 to-navy-900",
  violet: "from-violet-500 to-violet-600",
  emerald: "from-emerald-500 to-emerald-600",
  sky: "from-sky-500 to-sky-600",
  rose: "from-rose-500 to-rose-600",
};

// Bazı mağazaların (Koton Resmi Mağaza, Bosch Yetkili Satıcı) elle hazırlanmış
// (curated) hiç ürünü yok — bu mağazalar için en yakın kategoriden örnek ürün
// listesi getirilir ki mağaza sayfası boş görünmesin.
const STORE_CATEGORY_FALLBACK: Record<string, string> = {
  "koton-resmi-magaza": "kadin",
  "bosch-yetkili-satici": "yapi-market",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getStoreProducts(store: Store) {
  const owned = curatedProducts.filter((product) => product.seller === store.name);
  if (owned.length >= 4) return owned;

  const fallbackSlug = STORE_CATEGORY_FALLBACK[store.slug];
  if (!fallbackSlug) return owned;

  const generated = generateCategoryProducts(fallbackSlug, 8).map((product) => ({
    ...product,
    seller: store.name,
  }));
  return [...owned, ...generated];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = stores.find((s) => s.slug === slug);
  return { title: store ? `${store.name} | VitrinPlus` : "Mağaza | VitrinPlus" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = stores.find((s) => s.slug === slug);

  if (!store) {
    return (
      <>
        <Header />
        <ComingSoon
          title="Bu mağaza bulunamadı"
          description="Aradığın mağaza kaldırılmış olabilir. Tüm mağazaları listeden inceleyebilirsin."
        />
        <Footer />
      </>
    );
  }

  const storeProducts = getStoreProducts(store);

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-5 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: "Mağazalar", href: "/magazalar" },
            { label: store.name },
          ]}
        />

        <div className="flex flex-col gap-4 rounded-2xl border border-navy-100/80 bg-white p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <span
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-extrabold text-white shadow-sm",
              toneClasses[store.tone]
            )}
          >
            {initials(store.name)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-navy-900 sm:text-2xl">{store.name}</h1>
              {store.badge === "founder" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  <Crown size={12} /> Kurucu Mağaza
                </span>
              ) : store.badge === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                  <BadgeCheck size={12} /> Onaylı Mağaza
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-navy-400">{store.categoryLabel}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-navy-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-navy-700">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {store.rating.toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package size={14} className="text-navy-400" />
                {store.productCount.toLocaleString("tr-TR")} ürün
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} className="text-navy-400" />
                {store.followerCount} takipçi
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-navy-900 sm:text-xl">
            {store.name} Ürünleri{" "}
            <span className="font-normal text-navy-400">({storeProducts.length})</span>
          </h2>

          {storeProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {storeProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 py-16 text-center">
              <p className="text-sm font-semibold text-navy-700">Bu mağazada henüz listelenen ürün yok</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
