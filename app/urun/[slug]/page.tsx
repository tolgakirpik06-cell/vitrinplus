import { notFound, permanentRedirect } from "next/navigation";
import { catalogProduct, catalogProducts } from "@/lib/catalog-server";
import { ProductImage } from "@/components/ui/ProductImage";
import { PublicQuestions } from "@/components/product/PublicQuestions";
import type { Metadata } from "next";
import { Package, ShieldCheck, RotateCcw, Truck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductCard } from "@/components/home/ProductCard";
import { ProductVisual, GenericCategoryVisual } from "@/components/ui/product-visuals";
import { ProductGallery, type GalleryImage } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { SellerCard } from "@/components/product/SellerCard";
import { resolveIcon } from "@/lib/icon-map";
import { RETURN_WINDOW_DAYS } from "@/lib/domain/returns";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await catalogProduct(slug);
  return product ? { title: `${product.name} | VitrinPlus`, description: product.description.slice(0, 160), alternates: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL ? { canonical: `/urun/${product.slug}` } : undefined } : { title: "Ürün bulunamadı | VitrinPlus", robots: { index: false } };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await catalogProduct(slug);

  if (!product) notFound();
  if (slug !== product.slug) permanentRedirect(`/urun/${product.slug}`);

  const visualNode =
    product.visual === "generic" ? (
      <GenericCategoryVisual icon={resolveIcon(product.icon, Package)} className="h-full w-full" />
    ) : (
      <ProductVisual visual={product.visual} className="h-full w-full" />
    );

  const galleryImages: GalleryImage[] = product.imageUrls?.length
    ? product.imageUrls.map((url, index) => ({ label: `Görsel ${index + 1}`, node: <div className="relative h-full w-full"><ProductImage src={url} alt={product.name} sizes="(max-width: 1024px) 90vw, 50vw" priority={index === 0} /></div> }))
    : [{ label: "Görsel bekleniyor", node: visualNode }];

  const discountBadge = product.discount ? (
    <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      %{product.discount} indirim
    </span>
  ) : undefined;

  const relatedProducts = (await catalogProducts({ categories: [product.category], pageSize: 7 })).items.filter(p => p.id !== product.id).slice(0, 6);

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
            variants={product.variantOptions?.length ? [{ type: "model", label: "Seçenek", options: product.variantOptions.map(v => v.label) }] : undefined}
            variantOptions={product.variantOptions}
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
                  {product.shipping.label}. Kargo bedeli sipariş özetinde mağaza kurallarına göre hesaplanır.
                </p>
                <p className="flex items-start gap-2.5">
                  <RotateCcw size={16} className="mt-0.5 shrink-0 text-navy-500" />
                  Teslimattan sonra {RETURN_WINDOW_DAYS} gün içinde iade talebi oluşturabilirsin.
                </p>
                <p className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  Tüm siparişler VitrinPlus Alıcı Güvencesi kapsamında korunur.
                </p>
              </div>
            </section>

            <section id="yorumlar" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">Kullanıcı Yorumları</h2>
              <p className="mt-4 text-sm text-navy-500">Henüz değerlendirme yok.</p>
            </section>
            <PublicQuestions slug={product.slug} />
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <SellerCard storeSlug={product.storeSlug} sellerName={product.seller} categoryLabel={product.category} productSlug={product.slug} productName={product.name} />
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

      </main>

      <Footer />
    </>
  );
}
