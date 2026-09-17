import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";

export const metadata: Metadata = { title: "Ödeme | VitrinPlus" };

export default function OdemePage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb
          items={[{ label: "Ana Sayfa", href: "/" }, { label: "Sepetim", href: "/sepet" }, { label: "Ödeme" }]}
        />

        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Siparişi Tamamla</h1>
          <p className="mt-1 text-sm text-navy-400">
            Teslimat ve ödeme bilgilerini gir, siparişini onayla.
          </p>
        </div>

        <CheckoutPageClient />
      </main>

      <Footer />
    </>
  );
}
