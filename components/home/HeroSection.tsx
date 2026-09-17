import Link from "next/link";
import { ArrowRight, Percent, Sparkles } from "lucide-react";
import { ProductVisual } from "@/components/ui/product-visuals";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/utils";

/** Unsplash üzerinden ücretsiz lisanslı (Unsplash License) editoryal/lifestyle fotoğraflar. */
function unsplash(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

const HERO_LIFESTYLE_PHOTO = unsplash("photo-1758520387283-303b0b332e89", 900, 900);
const SELLER_PHOTO = unsplash("photo-1594392175511-30eca83d51c8", 700, 500);
const TRY_ON_PHOTO = unsplash("photo-1576193929684-06c6c6a8b582", 700, 500);

/** Hero'nun altındaki editoryal kompozisyon hissi için moda + teknoloji + güzellik karışımı. */
const TEASER_SLUGS = ["nike-air-force-1", "galaxy-s24-ultra", "loreal-elixir-parfum"];
const teaserProducts = TEASER_SLUGS.map((slug) => products.find((product) => product.slug === slug)).filter(
  (product): product is NonNullable<typeof product> => Boolean(product)
);

/**
 * Ana sayfanın hero'su — referanstaki gibi solda büyük, açık/premium bir
 * lifestyle kompozisyonu (%68), sağda iki dar kampanya kartı (%32).
 */
export function HeroSection() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2.1fr_1fr] lg:gap-5">
      <div className="flex flex-col gap-4">
        <div className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#f3ecff] via-[#f7f2ff] to-[#fdf1f7] shadow-premium sm:flex-row sm:items-stretch">
          <div
            className="pointer-events-none absolute -left-14 -top-14 h-60 w-60 rounded-full bg-brand-300/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-1/4 top-4 h-32 w-32 rounded-full bg-rose-200/25 blur-3xl sm:hidden"
            aria-hidden
          />

          <div className="relative z-10 flex-1 px-6 py-9 sm:max-w-[54%] sm:px-9 sm:py-11">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-600 ring-1 ring-brand-200 backdrop-blur-sm">
              <Sparkles size={12} />
              VitrinPlus
            </span>

            <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
              Vitrin senin.
              <br />
              <span className="text-brand-600">Seçim senin.</span>
            </h1>
            <p className="mt-3 max-w-sm text-sm text-navy-500 sm:text-base">
              Aradığın ürünler, keşfedeceğin fırsatlar.
            </p>

            <Link
              href="/kategoriler"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-10px_rgba(124,58,237,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Alışverişe Başla
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Premium lifestyle ürün kompozisyonu — gerçek fotoğraf */}
          <div className="relative min-h-[220px] flex-1 overflow-hidden sm:min-h-0 sm:max-w-[46%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_LIFESTYLE_PHOTO}
              alt="Alışveriş poşetleriyle gülümseyen iki kadın — VitrinPlus lifestyle kompozisyonu"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#f3ecff] via-[#f3ecff]/10 to-transparent sm:from-[#f3ecff] sm:via-transparent"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/25 via-transparent to-transparent" aria-hidden />

            {/* Editoryal kompozisyon hissi veren, farklı kategorilerden yüzen ürün rozetleri */}
            <div
              className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 rotate-6 items-center justify-center rounded-2xl bg-white/85 p-2.5 shadow-card ring-1 ring-white/60 backdrop-blur-sm sm:flex"
              aria-hidden
            >
              <ProductVisual visual="sneaker" className="h-full w-full" />
            </div>
            <div
              className="pointer-events-none absolute bottom-6 left-4 hidden h-14 w-14 -rotate-6 items-center justify-center rounded-2xl bg-white/85 p-2 shadow-card ring-1 ring-white/60 backdrop-blur-sm sm:flex"
              aria-hidden
            >
              <ProductVisual visual="perfume" className="h-full w-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {teaserProducts.map((product) => (
            <Link
              key={product.id}
              href={`/urun/${product.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-navy-100/70 bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-3.5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-50 p-1.5 sm:h-14 sm:w-14">
                <ProductVisual visual={product.visual === "generic" ? "phone" : product.visual} className="h-full w-full" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-navy-800 sm:text-[13px]">
                  {product.name}
                </span>
                <span className="mt-0.5 block text-xs font-extrabold text-navy-900 sm:text-sm">
                  {formatPrice(product.price)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3">
        {/* Kompakt, yatay kart: fotoğraf küçük bir thumbnail, metin alanı
            sıkılaştırılmış — hero'nun genel oranını/dengeyi bozmadan bu iki
            kartın dikey yer kaplamasını belirgin şekilde azaltır. */}
        <Link
          href="/satici-basvuru"
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-3 shadow-premium sm:p-3.5"
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
            <Percent size={16} />
          </span>
          <div className="relative min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold leading-tight text-white sm:text-[0.925rem]">
              Mağazanı aç, kazancın sende kalsın.
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="font-extrabold text-lime-300">%0 KOMİSYON</span>
              <span className="inline-flex items-center gap-1 font-semibold text-white/80">
                Mağaza Aç
                <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </p>
          </div>
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SELLER_PHOTO}
              alt="Kutularını hazırlayan bir VitrinPlus mağaza sahibi"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>

        <Link
          href="/kategori/kadin"
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-lime-100 via-lime-50 to-amber-50 p-3 shadow-premium ring-1 ring-lime-200/60 sm:p-3.5"
        >
          <div
            className="pointer-events-none absolute -top-8 -left-8 h-28 w-28 rounded-full bg-lime-300/30 blur-2xl"
            aria-hidden
          />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
            <Sparkles size={16} />
          </span>
          <div className="relative min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold leading-tight text-navy-900 sm:text-[0.925rem]">
              AI ile Üstümde Gör
            </h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-navy-500">
              Ücretsiz Dene
              <ArrowRight size={12} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </p>
          </div>
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TRY_ON_PHOTO}
              alt="Kıyafet kombinini deneyen bir moda modeli"
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
