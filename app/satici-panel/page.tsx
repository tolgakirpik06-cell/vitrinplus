import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SellerPanel } from "@/components/seller/SellerPanel";

export const metadata: Metadata = { title: "Satıcı Paneli | PazarBuy" };

export default function SaticiPanelPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Satıcı Paneli" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-900 text-white">
              <LayoutDashboard size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Satıcı Paneli</h1>
              <p className="mt-1 text-sm text-navy-400">TeknoMarket · Pro Paket</p>
            </div>
          </div>
          <p className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
            Bu bir demo panel önizlemesidir
          </p>
        </div>

        <SellerPanel />
      </main>

      <Footer />
    </>
  );
}
