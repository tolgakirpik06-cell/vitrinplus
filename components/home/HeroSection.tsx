import Link from "next/link";
import { ArrowRight, Percent, Sparkles, Tag, Megaphone, Wand2, Star, Package } from "lucide-react";
import { ProductVisual, GenericCategoryVisual } from "@/components/ui/product-visuals";
import { products } from "@/data/products";
import { stores } from "@/data/stores";
import { formatPrice, cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon-map";

/** Unsplash üzerinden ücretsiz lisanslı (Unsplash License) editoryal/lifestyle fotoğraflar. */
function unsplash(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

const HERO_LIFESTYLE_PHOTO = unsplash("photo-1758520387283-303b0b332e89", 900, 900);
const SELLER_PHOTO = unsplash("photo-1594392175511-30eca83d51c8", 700, 500);
const TRY_ON_PHOTO = unsplash("photo-1576193929684-06c6c6a8b582", 700, 500);

const storeToneClasses: Record<(typeof stores)[number]["tone"], string> = {
  brand: "from-brand-500 to-brand-600",
  navy: "from-navy-700 to-navy-900",
  violet: "from-violet-500 to-violet-600",
  emerald: "from-emerald-500 to-emerald-600",
  sky: "from-sky-500 to-sky-600",
  rose: "from-rose-500 to-rose-600",
};

function storeInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Hero'nun altındaki klasik, tek düze "gözat" şeridi yerine 3 yönlü,
 * gerçek verilerden beslenen bir vitrin: (A) o an indirimde olan gerçek
 * bir ürün, (B) sponsorlu/öne çıkan bir mağaza (kendi mağaza sayfasına
 * bağlanır), (C) "sana özel" — gerçek bir kişiselleştirme motoru henüz
 * bağlı olmadığından, kullanıcıya özel gibi görünen sahte bir öneri
 * ASLA gösterilmez; bunun yerine dürüst, jenerik bir "Senin İçin Seçtik"
 * ifadesiyle etiketlenir.
 */
function pickHeroShowcase() {
  const discountPick = products.find((product) => Boolean(product.oldPrice)) ?? products[0];
  const sponsoredStore = stores.find((store) => store.badge === "verified") ?? stores[0];
  const personalPick =
    products.find((product) => product.tags.includes("sana-ozel") && product.slug !== discountPick.slug) ??
    products.find((product) => product.slug !== discountPick.slug) ??
    discountPick;

  return { discountPick, sponsoredStore, personalPick };
}

/**
 * Ana sayfanın hero'su — referanstaki gibi solda büyük, açık/premium bir
 * lifestyle kompozisyonu (%68), sağda iki dar kampanya kartı (%32).
 */
export function HeroSection() {
  const { discountPick, sponsoredStore, personalPick } = pickHeroShowcase();
  const discountPercent = discountPick.oldPrice
    ? Math.round((1 - discountPick.price / discountPick.oldPrice) * 100)
    : null;

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

        {/* Klasik, tek düze "gözat" şeridi yerine 3 yönlü dinamik vitrin —
            her kart farklı bir amaca hizmet eder ve gerçek veriye dayanır. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href={`/urun/${discountPick.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-3.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 sm:h-14 sm:w-14">
              {discountPick.visual === "generic" ? (
                <GenericCategoryVisual icon={resolveIcon(discountPick.icon, Package)} className="h-full w-full" />
              ) : (
                <ProductVisual visual={discountPick.visual} className="h-full w-full" />
              )}
            </span>
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                <Tag size={10} /> İndirimde{discountPercent ? ` · %${discountPercent}` : ""}
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-navy-800 sm:text-[13px]">
                {discountPick.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs font-extrabold text-navy-900 sm:text-sm">
                {formatPrice(discountPick.price)}
                {discountPick.oldPrice ? (
                  <span className="text-[11px] font-medium text-navy-300 line-through">
                    {formatPrice(discountPick.oldPrice)}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>

          <Link
            href={`/magaza/${sponsoredStore.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-navy-100/70 bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-3.5"
          >
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-extrabold text-white sm:h-14 sm:w-14",
                storeToneClasses[sponsoredStore.tone]
              )}
            >
              {storeInitials(sponsoredStore.name)}
            </span>
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-navy-400">
                <Megaphone size={10} /> Sponsorlu Mağaza
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-navy-800 sm:text-[13px]">
                {sponsoredStore.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-navy-500">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {sponsoredStore.rating.toFixed(1)} · {sponsoredStore.categoryLabel}
              </span>
            </span>
          </Link>

          <Link
            href={`/urun/${personalPick.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-3.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 sm:h-14 sm:w-14">
              {personalPick.visual === "generic" ? (
                <GenericCategoryVisual icon={resolveIcon(personalPick.icon, Package)} className="h-full w-full" />
              ) : (
                <ProductVisual visual={personalPick.visual} className="h-full w-full" />
              )}
            </span>
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                <Wand2 size={10} /> Senin İçin Seçtik
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-navy-800 sm:text-[13px]">
                {personalPick.name}
              </span>
              <span className="mt-0.5 block text-xs font-extrabold text-navy-900 sm:text-sm">
                {formatPrice(personalPick.price)}
              </span>
            </span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3.5">
        {/* Orta boy, premium kart: solda metin + güçlü %0 KOMİSYON vurgusu,
            sağda büyük bir görsel şerit — Mağaza Aç ~148px, AI kartı ~122px
            hedef yükseklikte; ilk (dev, tam dikey fotoğraflı) sürümden daha
            kompakt, ama önceki aşırı küçültülmüş halinden belirgin şekilde
            daha ferah ve okunaklı. */}
        <Link
          href="/satici-basvuru"
          className="group relative flex h-[148px] items-stretch overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 shadow-premium"
        >
          <div
            className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-2 py-4 pl-5 pr-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
              <Percent size={18} />
            </span>
            <h2 className="text-base font-extrabold leading-tight text-white sm:text-lg">
              Mağazanı aç,
              <br />
              kazancın sende kalsın.
            </h2>
            <p className="flex items-center gap-2">
              <span className="rounded-full bg-lime-300 px-2.5 py-1 text-xs font-extrabold text-navy-950">
                %0 KOMİSYON
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/85">
                Mağaza Aç
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </p>
          </div>
          <div className="relative w-[38%] shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SELLER_PHOTO}
              alt="Kutularını hazırlayan bir VitrinPlus mağaza sahibi"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-600/70 via-transparent to-transparent"
              aria-hidden
            />
          </div>
        </Link>

        <Link
          href="/kategori/kadin"
          className="group relative flex h-[122px] items-stretch overflow-hidden rounded-3xl bg-gradient-to-br from-lime-100 via-lime-50 to-amber-50 shadow-premium ring-1 ring-lime-200/60"
        >
          <div
            className="pointer-events-none absolute -top-8 -left-8 h-28 w-28 rounded-full bg-lime-300/30 blur-2xl"
            aria-hidden
          />
          <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pl-5 pr-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500/15 text-lime-700">
              <Sparkles size={15} />
            </span>
            <h2 className="text-sm font-extrabold leading-tight text-navy-900 sm:text-base">
              AI ile Üzerimde Gör
            </h2>
            <p className="flex items-center gap-1 text-xs font-semibold text-navy-500">
              Ücretsiz Dene
              <ArrowRight size={13} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </p>
          </div>
          <div className="relative w-[34%] shrink-0 overflow-hidden">
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
