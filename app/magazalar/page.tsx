import type { Metadata } from "next";
import { Store } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StoreCard } from "@/components/ui/StoreCard";
import { stores } from "@/data/stores";

export const metadata: Metadata = { title: "Mağazalar | VitrinPlus" };

export default function MagazalarPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Mağazalar" }]} />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-600">
            <Store size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Mağazalar</h1>
            <p className="mt-1 text-sm text-navy-400">{stores.length} satıcı mağazası VitrinPlus&apos;ta</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} id={store.slug} />
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
