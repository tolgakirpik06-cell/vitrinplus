import type { Metadata } from "next";
import { Package, Star, ShieldCheck, RotateCcw, Truck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { RatingStars } from "@/components/ui/RatingStars";
import { ProductCard } from "@/components/home/ProductCard";
import { ProductVisual, GenericCategoryVisual } from "@/components/ui/product-visuals";
import { ProductGallery, type GalleryImage } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { SellerCard } from "@/components/product/SellerCard";
import { getProductBySlug, getRelatedProducts, getSampleReviews } from "@/lib/mock-catalog";

const VIEW_LABELS: Record<string, string> = {
  "on-gorunum": "Ön Görünüm",
  "detay-gorunum": "Detay",
  "yan-gorunum": "Yan Görünüm",
  "kullanim-ani": "Kullanım Anı",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.name} | VitrinPlus` : "Ürün | VitrinPlus" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return (
      <>
        <Header />
        <ComingSoon
          title="Bu ürün bulunamadı"
          description="Aradığın ürün kaldırılmış ya da satıcı tarafından yayından kaldırılmış olabilir. Kategorilerden benzer ürünlere göz atabilirsin."
        />
        <Footer />
      </>
    );
  }

  const visualNode =
    product.visual === "generic" ? (
      <GenericCategoryVisual icon={product.icon ?? Package} className="h-full w-full" />
    ) : (
      <ProductVisual visual={product.visual} className="h-full w-full" />
    );

  const galleryImages: GalleryImage[] = product.images.map((image, index) => {
    const [, view] = image.split(":");
    return { label: VIEW_LABELS[view] ?? `Görünüm ${index + 1}`, node: visualNode };
  });

  const discountBadge = product.discount ? (
    <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      %{product.discount} indirim
    </span>
  ) : undefined;

  const reviews = getSampleReviews(product);
  const relatedProducts = getRelatedProducts(product, 6, 0);
  const alsoViewed = getRelatedProducts(product, 6, 6);

  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-8 py-5 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: product.category },
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <ProductGallery images={galleryImages} badge={discountBadge} />

          <ProductPurchasePanel
            slug={product.slug}
            name={product.name}
            brand={product.brand}
            price={product.price}
            oldPrice={product.oldPrice}
            discount={product.discount}
            rating={product.rating}
            reviewCount={product.reviewCount}
            stock={product.stock}
            shipping={product.shipping}
            variants={product.variants}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            <section id="aciklama" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">Ürün Açıklaması</h2>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">{product.description}</p>
            </section>

            <section id="ozellikler" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">Ürün Özellikleri</h2>
              <dl className="mt-4 divide-y divide-navy-50">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <dt className="text-navy-400">{spec.label}</dt>
                    <dd className="text-right font-semibold text-navy-800">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="teslimat-iade" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">Teslimat ve İade</h2>
              <div className="mt-4 flex flex-col gap-3 text-sm text-navy-600">
                <p className="flex items-start gap-2.5">
                  <Truck size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {product.shipping.label} seçeneğiyle tahmini{" "}
                  {product.shipping.variant === "fast" ? "1-2" : "2-4"} iş günü içinde kapınızda.
                </p>
                <p className="flex items-start gap-2.5">
                  <RotateCcw size={16} className="mt-0.5 shrink-0 text-navy-500" />
                  Ürünü teslim aldıktan sonra 15 gün içinde ücretsiz iade edebilirsiniz.
                </p>
                <p className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  Tüm siparişler VitrinPlus Alıcı Güvencesi kapsamında korunur.
                </p>
              </div>
            </section>

            <section id="yorumlar" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-navy-900">Kullanıcı Yorumları</h2>
                <RatingStars rating={product.rating} />
              </div>
              <div className="mt-4 flex flex-col divide-y divide-navy-50">
                {reviews.map((review, index) => (
                  <div key={`${review.author}-${index}`} className="flex flex-col gap-1.5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-navy-800">{review.author}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-navy-400">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {review.rating}
                        <span className="text-navy-300">· {review.daysAgo} gün önce</span>
                      </span>
                    </div>
                    <p className="text-sm text-navy-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="soru-cevap" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">Soru & Cevap</h2>
              <div className="mt-4 flex flex-col divide-y divide-navy-50">
                <div className="py-3.5">
                  <p className="text-sm font-semibold text-navy-800">Ürün orijinal kutusunda mı geliyor?</p>
                  <p className="mt-1 text-sm text-navy-600">
                    Evet, tüm ürünler orijinal ambalajında ve satıcı garantisiyle gönderilir.
                  </p>
                </div>
                <div className="py-3.5">
                  <p className="text-sm font-semibold text-navy-800">Kargoya ne zaman veriliyor?</p>
                  <p className="mt-1 text-sm text-navy-600">
                    Siparişler genellikle aynı gün veya bir sonraki iş günü kargoya teslim edilir.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <SellerCard sellerName={product.seller} categoryLabel={product.category} />
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <section>
            <h2 className="mb-4 text-lg font-bold text-navy-900">Benzer Ürünler</h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}

        {alsoViewed.length > 0 ? (
          <section>
            <h2 className="mb-4 text-lg font-bold text-navy-900">Bu Ürünü Alanlar Bunlara da Baktı</h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
              {alsoViewed.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
