"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart, ShieldCheck, Truck, Package, Minus, Plus, Trash2, Heart, Tag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { ProductVisual, GenericCategoryVisual } from "@/components/ui/product-visuals";
import { useDemo } from "@/components/demo/DemoProvider";
import { totals } from "@/lib/demo-marketplace";
import { formatPrice } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon-map";
import type { Product } from "@/types";

const FREE_SHIPPING_THRESHOLD = 250;
const COUPON_CODE = "VITRINPLUS10";

export function CartPageClient() {
  const { lines, updateQuantity, removeItem, coupon: appliedCoupon, setCoupon: setAppliedCoupon } = useCart();
  const { resolveProduct, ready } = useDemo();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  const resolvedLines = useMemo(() => {
    return lines
      .map((line) => ({ line, product: resolveProduct(line.slug) }))
      .filter((entry): entry is { line: (typeof lines)[number]; product: Product } =>
        Boolean(entry.product)
      );
  }, [lines, resolveProduct]);

  const subtotal = resolvedLines.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);
  const { discount, shipping, total } = totals(subtotal, appliedCoupon);
  const afterDiscount = subtotal - discount;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount);

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (code === COUPON_CODE) {
      setAppliedCoupon(code);
      setCouponError(null);
    } else {
      setCouponError("Kupon kodu geçersiz.");
      setAppliedCoupon(null);
    }
  }

  if (!ready) return <p>Sepet yükleniyor…</p>;

  if (resolvedLines.length === 0 && lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-navy-100 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <ShoppingCart size={26} />
        </span>
        <div>
          <p className="text-base font-bold text-navy-900">Sepetin boş</p>
          <p className="mt-1 text-sm text-navy-400">Alışverişe başlamak için ürünlere göz atabilirsin.</p>
        </div>
        <Link
          href="/"
          className="mt-1 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
        >
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {lines.filter(line => !resolveProduct(line.slug)).map(line => <div key={line.lineId} className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Ürün artık satışta değil. <button className="underline" onClick={() => removeItem(line.lineId)}>Sepetten kaldır</button></div>)}
        {resolvedLines.map(({ line, product }) => (
          <div
            key={line.lineId}
            className="flex items-center gap-4 rounded-2xl border border-navy-100/80 bg-white p-3.5 sm:p-4"
          >
            <Link
              href={`/urun/${product.slug}`}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-50 p-2"
            >
              {product.visual === "generic" ? (
                <GenericCategoryVisual icon={resolveIcon(product.icon, Package)} className="h-full w-full" />
              ) : (
                <ProductVisual visual={product.visual} className="h-full w-full" />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/urun/${product.slug}`}
                className="line-clamp-1 text-sm font-semibold text-navy-800 hover:text-brand-600"
              >
                {product.name}
              </Link>
              <p className="mt-0.5 text-xs text-navy-400">{product.seller}</p>
              {line.variantLabel ? (
                <p className="mt-0.5 text-xs text-navy-400">Varyant: {line.variantLabel}</p>
              ) : null}
              <p className="mt-1.5 text-sm font-extrabold text-navy-900">{formatPrice(product.price)}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-navy-100 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(line.lineId, line.quantity - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-navy-500 transition-colors hover:bg-navy-50"
                  aria-label="Adedi azalt"
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-xs font-bold text-navy-900">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(line.lineId, Math.min(product.stock || line.quantity + 1, line.quantity + 1))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-full text-navy-500 transition-colors hover:bg-navy-50"
                  aria-label="Adedi artır"
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-navy-400">
                <button
                  type="button"
                  onClick={() => removeItem(line.lineId)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-rose-600"
                >
                  <Trash2 size={12} /> Sil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isFavorite(product.slug)) toggleFavorite(product.slug);
                    removeItem(line.lineId);
                  }}
                  className="inline-flex items-center gap-1 transition-colors hover:text-brand-600"
                >
                  <Heart size={12} /> Favorilere Taşı
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-navy-100/80 bg-white p-5 lg:w-80">
        {remainingForFreeShipping > 0 ? (
          <div className="mb-4 rounded-xl bg-navy-50/70 p-3 text-xs text-navy-600">
            <p className="font-semibold">Ücretsiz kargoya {formatPrice(remainingForFreeShipping)} kaldı</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.min(100, (afterDiscount / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            <Truck size={14} /> Ücretsiz kargo kazandın!
          </div>
        )}

        <p className="text-sm font-bold text-navy-900">Sipariş Özeti</p>

        <div className="mt-3">
          <label htmlFor="cart-coupon" className="mb-1.5 block text-xs font-semibold text-navy-500">Kupon Kodu</label>
          <div className="flex items-center gap-2">
            <input
              id="cart-coupon"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Örn: VITRINPLUS10"
              className="h-9 min-w-0 flex-1 rounded-lg border border-navy-100 px-3 text-xs text-navy-700 outline-none transition-colors focus:border-brand-400"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <Tag size={12} /> Uygula
            </button>
          </div>
          {couponError ? <p className="mt-1.5 text-[11px] text-rose-600">{couponError}</p> : null}
          {appliedCoupon ? (
            <p className="mt-1.5 text-[11px] text-emerald-600">&quot;{appliedCoupon}&quot; kuponu uygulandı.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between text-navy-500">
            <span>Ürün Toplamı</span>
            <span className="font-semibold text-navy-800">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Kupon İndirimi</span>
              <span className="font-semibold">-{formatPrice(discount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-navy-500">
            <span>Kargo</span>
            <span className="font-semibold text-navy-800">
              {shipping === 0 ? "Ücretsiz" : formatPrice(shipping)}
            </span>
          </div>
          <div className="my-1 h-px bg-navy-50" />
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-navy-900">Genel Toplam</span>
            <span className="font-extrabold text-navy-900">{formatPrice(total)}</span>
          </div>
        </div>

        <Link
          href="/odeme"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
        >
          Alışverişi Tamamla
        </Link>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-navy-50 pt-4 text-xs text-navy-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            Güvenli ödeme &amp; kolay iade
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck size={13} className="text-brand-500" />
            {formatPrice(FREE_SHIPPING_THRESHOLD)} üzeri siparişlerde ücretsiz kargo
          </span>
        </div>
      </div>
    </div>
  );
}
