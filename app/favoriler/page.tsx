import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductCard } from "@/components/home/ProductCard";
import { products } from "@/data/products";

export const metadata: Metadata = { title: "Favorilerim | PazarBuy" };

export default function FavorilerPage() {
  const favorites = products.slice(0, 8);

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Favorilerim" }]} />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Heart size={20} className="fill-rose-500" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Favorilerim</h1>
            <p className="mt-1 text-sm text-navy-400">{favorites.length} ürün favorilerinde</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <p className="text-center text-xs text-navy-400">
          Favori listesi bu demo sürümde örnek verilerle gösteriliyor.{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:text-brand-700">
            Alışverişe devam et
          </Link>
        </p>
      </main>

      <Footer />
    </>
  );
}
