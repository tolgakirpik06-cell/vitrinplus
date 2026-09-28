import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

import { catalogProducts } from "@/lib/catalog-server";
import { ProductCard } from "@/components/home/ProductCard";
import { pageNumber } from "@/lib/catalog-normalize";
import { CatalogPagination } from "@/components/ui/CatalogPagination";
import { CatalogEmpty } from "@/components/ui/CatalogEmpty";

export const metadata: Metadata = { title: "Kampanyalar | VitrinPlus" };

export default async function KampanyalarPage({ searchParams }: { searchParams: Promise<{ sayfa?: string }> }) {
  const page = pageNumber((await searchParams).sayfa);
  const { items, total } = await catalogProducts({ discounted: true, inStock: true, page: page - 1, pageSize: 24 });
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Kampanyalar" }]} />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Megaphone size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Kampanyalar</h1>
            <p className="mt-1 text-sm text-navy-400">Güncel indirim ve fırsatları kaçırma</p>
          </div>
        </div>

        {items.length === 0 && <CatalogEmpty message="Şu anda yayında indirimli ürün yok." />}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <CatalogPagination page={page} total={total} size={24} path="/kampanyalar" />
      </main>

      <Footer />
    </>
  );
}
