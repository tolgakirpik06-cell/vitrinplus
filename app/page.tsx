import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CategoryStrip } from "@/components/layout/CategoryStrip";
import { PromoBanners } from "@/components/home/PromoBanners";
import { ProductRow } from "@/components/home/ProductRow";
import { PopularStores } from "@/components/home/PopularStores";
import { CampaignsSection } from "@/components/home/CampaignsSection";
import { StatsBar } from "@/components/home/StatsBar";
import { SellerCta } from "@/components/home/SellerCta";
import { PricingSection } from "@/components/home/PricingSection";
import { PerksSection } from "@/components/home/PerksSection";
import { productRows } from "@/data/product-sections";
import { products } from "@/data/products";

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-5 sm:gap-7 sm:py-6">
        <CategoryStrip />
        <PromoBanners />

        <div className="flex flex-col gap-7 sm:gap-8">
          {productRows.map((row) => (
            <ProductRow key={row.id} config={row} products={products} />
          ))}
        </div>

        <PopularStores />
        <CampaignsSection />

        <StatsBar />

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SellerCta />
          <PricingSection />
          <PerksSection />
        </section>
      </main>

      <Footer />
    </>
  );
}
