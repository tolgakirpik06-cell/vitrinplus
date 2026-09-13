"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShieldCheck, Truck, Zap, CreditCard, CheckCircle2 } from "lucide-react";
import type { ProductVariantGroup, ShippingInfo } from "@/types";
import { useCart } from "@/components/cart/CartProvider";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { RatingStars } from "@/components/ui/RatingStars";
import { Button } from "@/components/ui/Button";
import { cn, formatPrice } from "@/lib/utils";

type Props = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  shipping: ShippingInfo;
  variants?: ProductVariantGroup[];
};

export function ProductPurchasePanel({
  slug,
  name,
  brand,
  price,
  oldPrice,
  discount,
  rating,
  reviewCount,
  stock,
  shipping,
  variants,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries((variants ?? []).map((group) => [group.type, group.options[0]]))
  );
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<"idle" | "added">("idle");

  const variantLabel = useMemo(() => {
    if (!variants || variants.length === 0) return undefined;
    return variants.map((group) => selected[group.type]).filter(Boolean).join(" / ");
  }, [variants, selected]);

  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;

  const installmentCount = 9;
  const installmentAmount = Math.ceil(price / installmentCount / 10) * 10;

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({ slug, quantity, variantLabel });
    setFeedback("added");
    window.setTimeout(() => setFeedback("idle"), 2200);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem({ slug, quantity, variantLabel });
    router.push("/sepet");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{brand}</p>
        <h1 className="mt-1 text-xl font-extrabold leading-snug text-navy-900 sm:text-2xl">{name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <RatingStars rating={rating} />
          <span className="text-xs text-navy-400">{reviewCount} değerlendirme</span>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100/80 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-2.5">
          <span className="text-3xl font-extrabold tracking-tight text-navy-900">{formatPrice(price)}</span>
          {oldPrice ? (
            <span className="text-sm text-navy-300 line-through">{formatPrice(oldPrice)}</span>
          ) : null}
          {discount ? (
            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
              %{discount} indirim
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-navy-400">
          <CreditCard size={13} />
          {installmentCount} taksit x {formatPrice(installmentAmount)}'den başlayan seçenekler
        </p>
      </div>

      {variants && variants.length > 0 ? (
        <div className="flex flex-col gap-4">
          {variants.map((group) => (
            <div key={group.type}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelected((prev) => ({ ...prev, [group.type]: option }))}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      selected[group.type] === option
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-navy-100 bg-white text-navy-600 hover:border-navy-300"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-navy-100/80 bg-white px-4 py-3">
        <span
          className={cn(
            "text-xs font-semibold",
            outOfStock ? "text-rose-600" : lowStock ? "text-brand-600" : "text-emerald-600"
          )}
        >
          {outOfStock ? "Stokta yok" : lowStock ? `Son ${stock} ürün!` : `Stokta ${stock} adet`}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={outOfStock}
            aria-label="Adedi azalt"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-sm font-bold text-navy-900">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
            disabled={outOfStock}
            aria-label="Adedi artır"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          {feedback === "added" ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-500" />
              Sepete Eklendi
            </>
          ) : (
            "Sepete Ekle"
          )}
        </Button>
        <Button variant="primary" size="lg" className="flex-1" disabled={outOfStock} onClick={handleBuyNow}>
          Hemen Al
        </Button>
        <FavoriteButton />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-navy-100/80 bg-navy-50/50 p-4 text-xs text-navy-600">
        <span className="inline-flex items-center gap-2">
          {shipping.variant === "fast" ? (
            <Zap size={14} className="text-brand-600" />
          ) : (
            <Truck size={14} className="text-emerald-600" />
          )}
          <span className="font-semibold">{shipping.label}</span>
          <span className="text-navy-400">
            · Tahmini teslimat {shipping.variant === "fast" ? "1-2" : "2-4"} iş günü
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={14} className="text-navy-500" />
          PazarBuy Alıcı Güvencesi ile korumalı alışveriş
        </span>
      </div>
    </div>
  );
}
