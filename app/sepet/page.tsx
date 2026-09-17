import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = { title: "Sepetim | VitrinPlus" };

export default function SepetPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Sepetim" }]} />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <ShoppingCart size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Sepetim</h1>
            <p className="mt-1 text-sm text-navy-400">Ürünlerini gözden geçir ve alışverişini tamamla</p>
          </div>
        </div>

        <CartPageClient />
      </main>

      <Footer />
    </>
  );
}
