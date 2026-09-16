import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CategoryStrip } from "@/components/layout/CategoryStrip";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryChips } from "@/components/home/CategoryChips";
import { DiscoverStyle } from "@/components/home/DiscoverStyle";
import { TryOnBanner } from "@/components/home/TryOnBanner";
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
  const featuredRow = productRows.find((row) => row.id === "ai-onerileri");
  const personalRow = productRows.find((row) => row.id === "sana-ozel");
  const otherRows = productRows.filter(
    (row) => row.id !== "ai-onerileri" && row.id !== "sana-ozel"
  );

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-7 py-5 sm:gap-9 sm:py-6">
        <CategoryStrip />

        <HeroSection />

        <CategoryChips />

        {featuredRow ? <ProductRow config={featuredRow} products={products} /> : null}

        <div className="flex flex-col gap-7 sm:gap-8">
          {otherRows.map((row) => (
            <ProductRow key={row.id} config={row} products={products} />
          ))}
        </div>

        <PromoBanners />

        <DiscoverStyle />

        {personalRow ? <ProductRow config={personalRow} products={products} /> : null}

        <PopularStores />
        <CampaignsSection />

        <TryOnBanner />

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
