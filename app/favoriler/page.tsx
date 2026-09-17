import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FavoritesPageClient } from "@/components/favorites/FavoritesPageClient";

export const metadata: Metadata = { title: "Favorilerim | VitrinPlus" };

export default function FavorilerPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Favorilerim" }]} />
        <FavoritesPageClient />
      </main>

      <Footer />
    </>
  );
}
