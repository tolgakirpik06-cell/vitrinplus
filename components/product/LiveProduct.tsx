"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Package, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useMarketplace } from "@/components/marketplace/context";
import { useEnsureProducts } from "@/components/marketplace/useEnsureProducts";
import { AskSellerButton } from "@/components/product/AskSellerButton";
import { ProductGallery, type GalleryImage } from "@/components/product/ProductGallery";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ProductImage } from "@/components/ui/ProductImage";
import { GenericCategoryVisual, ProductVisual } from "@/components/ui/product-visuals";
import { RETURN_WINDOW_DAYS } from "@/lib/domain/returns";
import { resolveIcon } from "@/lib/icon-map";
import { useAsync } from "@/lib/use-async";
import { formatPrice } from "@/lib/utils";
import type { PublicQuestionView } from "@/lib/repositories/types";

const card = "rounded-2xl border border-navy-100 bg-white p-5 sm:p-6";

function PublicQuestions({ slug }: { slug: string }) {
  const { services } = useMarketplace();
  const load = useCallback(() => services.questions.listPublic(slug), [services, slug]);
  const questions = useAsync<PublicQuestionView[]>(load);

  return (
    <section id="sorular" className={card} aria-labelledby="sorular-baslik">
      <h2 id="sorular-baslik" className="text-lg font-bold text-navy-900">Ürün Soruları</h2>
      {questions.loading && !questions.data ? (
        <p role="status" className="mt-3 text-sm text-navy-400">Sorular yükleniyor…</p>
      ) : questions.error ? (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          Sorular yüklenemedi. {questions.error}{" "}
          <button type="button" onClick={questions.reload} className="font-semibold underline">Tekrar dene</button>
        </p>
      ) : !questions.data || questions.data.length === 0 ? (
        <p className="mt-3 text-sm text-navy-400">Bu ürün için henüz yanıtlanmış soru yok. Aklına takılanı satıcıya sorabilirsin.</p>
      ) : (
        <ul className="mt-4 divide-y divide-navy-50">
          {questions.data.map((item) => (
            <li key={item.id} className="py-3 text-sm">
              <p className="font-semibold text-navy-800">{item.question}</p>
              <p className="mt-1 text-navy-600">{item.answer}</p>
              <p className="mt-1 text-[11px] text-navy-400">{item.askerDisplay} · {new Date(item.answeredAt).toLocaleDateString("tr-TR")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Gerçek mağaza ürünü sayfası: gerçek görseller, seçenek (varyant) bazlı stok, yanıtlanmış sorular. */
export function LiveProduct({ slug }: { slug: string }) {
  const { resolveProduct, ready } = useMarketplace();
  const { addItem } = useCart();
  const { loading, error, retry } = useEnsureProducts([slug], { force: true });
  const [picked, setPicked] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const product = resolveProduct(slug);

  if (!ready || (loading && !product)) return <p role="status">Ürün yükleniyor…</p>;
  if (!product && error) {
    return (
      <div role="alert" className={card}>
        Ürün bilgileri alınamadı. {error}{" "}
        <button type="button" onClick={retry} className="font-semibold text-brand-600 underline">Tekrar dene</button>
      </div>
    );
  }
  if (!product) {
    return (
      <div className={card}>
        Bu ürün artık satışta değil. <Link href="/" className="text-brand-600">Diğer ürünlere göz at</Link>
      </div>
    );
  }

  const options = product.variantOptions ?? [];
  const chosen = options.length > 0 ? (options.find((option) => option.label === picked) ?? options.find((option) => option.stock > 0) ?? options[0]) : null;
  const available = chosen ? chosen.stock : product.stock;
  const qty = Math.min(Math.max(quantity, 1), Math.max(available, 1));

  const fallback =
    product.visual === "generic" ? (
      <GenericCategoryVisual icon={resolveIcon(product.icon, Package)} className="h-full w-full" />
    ) : (
      <ProductVisual visual={product.visual} className="h-full w-full" />
    );
  const urls = product.imageUrls ?? [];
  const images: GalleryImage[] =
    urls.length > 0
      ? urls.map((url, index) => ({
          label: `${product.name} — görsel ${index + 1}`,
          node: (
            <div className="relative h-full w-full">
              <ProductImage src={url} alt={index === 0 ? product.name : ""} sizes="(min-width: 1024px) 50vw, 100vw" priority={index === 0} />
            </div>
          ),
        }))
      : [{ label: product.name, node: fallback }];

  const store = product.storeInfo;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ProductGallery
          images={images}
          badge={product.discount ? <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">%{product.discount} indirim</span> : undefined}
        />

        <section className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-brand-600">{product.seller}</p>
              <h1 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">{product.name}</h1>
              {product.brand ? <p className="mt-1 text-xs text-navy-400">Marka: {product.brand}</p> : null}
            </div>
            <FavoriteButton slug={product.slug} />
          </div>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{formatPrice(product.price)}</span>
            {product.oldPrice ? <span className="text-sm text-navy-300 line-through">{formatPrice(product.oldPrice)}</span> : null}
          </p>

          {options.length > 0 ? (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-navy-700">Seçenek</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((option) => {
                  const active = chosen?.label === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      disabled={option.stock < 1}
                      onClick={() => {
                        setPicked(option.label);
                        setQuantity(1);
                        setAdded(false);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "border-navy-200 text-navy-700 hover:border-navy-400"}`}
                    >
                      {option.label}
                      {option.stock < 1 ? " · tükendi" : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <p className="mt-5 text-sm text-navy-500">
            {available < 1 ? "Stok tükendi" : available <= 5 ? `Son ${available} adet` : "Stokta var"} · {product.category}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
              Adet
              <input
                type="number"
                min={1}
                max={Math.max(available, 1)}
                step={1}
                value={qty}
                disabled={available < 1}
                onChange={(event) => {
                  const next = Math.floor(Number(event.target.value));
                  setQuantity(Number.isFinite(next) ? next : 1);
                  setAdded(false);
                }}
                className="h-10 w-20 rounded-xl border border-navy-200 px-3 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={available < 1}
              onClick={() => {
                addItem({ slug: product.slug, quantity: qty, variantLabel: chosen?.label });
                setAdded(true);
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {available < 1 ? "Stok tükendi" : "Sepete ekle"}
            </button>
            <AskSellerButton sellerName={product.seller} productSlug={product.slug} productName={product.name} />
          </div>
          {added ? (
            <p role="status" className="mt-4 text-sm text-emerald-700">
              Sepete eklendi. <Link href="/sepet" className="font-bold underline">Sepete git</Link>
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5 border-t border-navy-50 pt-4 text-sm text-navy-600">
            {store ? (
              <p className="flex items-start gap-2.5">
                <Truck size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
                Kargo {store.shippingFee === 0 ? "ücretsiz" : formatPrice(store.shippingFee)}; {formatPrice(store.freeShippingThreshold)} ve üzeri siparişlerde ücretsiz.
              </p>
            ) : null}
            <p className="flex items-start gap-2.5">
              <RotateCcw size={16} className="mt-0.5 shrink-0 text-navy-500" aria-hidden />
              Teslimattan sonra {RETURN_WINDOW_DAYS} gün içinde iade talebi oluşturabilirsin.
            </p>
            <p className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              Ödeme sağlayıcısı henüz bağlı değil; siparişlerde şimdilik tahsilat yapılmaz.
            </p>
          </div>
        </section>
      </div>

      <section id="aciklama" className={card}>
        <h2 className="text-lg font-bold text-navy-900">Ürün Açıklaması</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-navy-600">{product.description || "Satıcı bu ürün için açıklama eklemedi."}</p>
      </section>

      <PublicQuestions slug={product.slug} />
    </div>
  );
}
