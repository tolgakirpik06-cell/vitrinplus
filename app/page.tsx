import { catalogProducts, catalogStores } from "@/lib/catalog-server";
import { CatalogEmpty } from "@/components/ui/CatalogEmpty";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CategoryStrip } from "@/components/layout/CategoryStrip";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryChips } from "@/components/home/CategoryChips";
import { DiscoverStyle } from "@/components/home/DiscoverStyle";
import { TryOnBanner } from "@/components/home/TryOnBanner";
import { PromoBanners } from "@/components/home/PromoBanners";
import { ProductRow } from "@/components/home/ProductRow";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { PopularStores } from "@/components/home/PopularStores";
import { CampaignsSection } from "@/components/home/CampaignsSection";
import { StatsBar } from "@/components/home/StatsBar";
import { SellerCta } from "@/components/home/SellerCta";
import { PricingSection } from "@/components/home/PricingSection";
import { PerksSection } from "@/components/home/PerksSection";
import { productRows } from "@/data/product-sections";



export default async function HomePage() {
  const [{ items: products }, { items: stores }] = await Promise.all([catalogProducts({ pageSize: 48, inStock: true }), catalogStores({ pageSize: 8 })]);
  const featuredRow = productRows.find((row) => row.id === "ai-onerileri");
  const personalRow = productRows.find((row) => row.id === "sana-ozel");
  const otherRows = productRows.filter(
    (row) => row.id !== "ai-onerileri" && row.id !== "sana-ozel"
  );

  // Satırlar sırayla işlenir ve her satırdan sonra kullanılan ürün id'leri
  // bir sonraki satırın "hariç tut" listesine eklenir — böylece art arda
  // gelen bölümler mümkün olduğunca aynı ürünleri tekrar etmez (madde 11).
  const shownIds = new Set<string>();
  function pickRowItems(row: (typeof productRows)[number]) {
    const candidates = row.id === "super-firsatlar" ? products.filter(p => p.discount) : products;
    const items = candidates.filter(p => !shownIds.has(p.id)).slice(0, row.id === "ai-onerileri" ? 8 : 4);
    items.forEach((product) => shownIds.add(product.id));
    return items;
  }

  const featuredItems = featuredRow ? pickRowItems(featuredRow) : [];
  const otherRowsWithItems = otherRows.map((row) => ({ row, items: pickRowItems(row) }));
  const personalItems = personalRow ? pickRowItems(personalRow) : [];

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-7 py-5 sm:gap-9 sm:py-6">
        <CategoryStrip />

        <HeroSection products={products} stores={stores} />

        <CategoryChips />
        {products.length === 0 && <CatalogEmpty />}

        {featuredRow && featuredItems.length ? <FeaturedCarousel config={featuredRow} items={featuredItems} /> : null}

        <div className="flex flex-col gap-7 sm:gap-8">
          {otherRowsWithItems.filter(({ items }) => items.length > 0).map(({ row, items }) => (
            <ProductRow key={row.id} config={row} items={items} />
          ))}
        </div>

        <PromoBanners products={products} />

        <DiscoverStyle />

        {personalRow && personalItems.length ? <ProductRow config={personalRow} items={personalItems} /> : null}

        <PopularStores items={stores} />
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
