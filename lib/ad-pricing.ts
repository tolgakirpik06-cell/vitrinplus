/**
 * Reklam ürünleri ve başlangıç fiyatları — tek merkezi kaynak.
 * Fiyatlar "günlük, başlangıç" fiyatıdır (TL/gün'den). Paket avantajı
 * `lib/plans.ts` içindeki `adDiscountPercent` üzerinden uygulanır.
 */
import { getPlan, type PlanKey } from "@/lib/plans";

export type AdProductKey =
  | "sponsored-product"
  | "search-sponsored"
  | "category-featured"
  | "home-featured"
  | "home-banner";

export type AdProduct = {
  key: AdProductKey;
  name: string;
  description: string;
  placement: string;
  /** Günlük başlangıç fiyatı (TL). */
  startingDailyPrice: number;
};

export const adProducts: AdProduct[] = [
  {
    key: "sponsored-product",
    name: "Sponsorlu Ürün",
    description: "Ürününü ilgili kategori ve ürün sayfalarında sponsorlu olarak öne çıkar.",
    placement: "Kategori ve ürün sayfaları",
    startingDailyPrice: 150,
  },
  {
    key: "search-sponsored",
    name: "Arama Sonuçlarında Sponsorlu",
    description: "Alıcıların aradığı anahtar kelimelerde üst sıralarda görün.",
    placement: "Arama sonuçları",
    startingDailyPrice: 250,
  },
  {
    key: "category-featured",
    name: "Kategori Öne Çıkarma",
    description: "Ürününü seçtiğin kategorinin vitrin alanında öne çıkar.",
    placement: "Kategori vitrini",
    startingDailyPrice: 300,
  },
  {
    key: "home-featured",
    name: "Ana Sayfa Öne Çıkanlar",
    description: "Ana sayfadaki öne çıkanlar şeridinde ürününü göster.",
    placement: "Ana sayfa",
    startingDailyPrice: 750,
  },
  {
    key: "home-banner",
    name: "Ana Sayfa Büyük Vitrin / Banner",
    description: "Ana sayfa büyük vitrininde markanı ve kampanyanı öne çıkar.",
    placement: "Ana sayfa büyük vitrin",
    startingDailyPrice: 1500,
  },
];

export type AdPrice =
  | { custom: true; base: number }
  | { custom: false; base: number; discountPercent: number; final: number };

/** Pakete göre günlük başlangıç fiyatı. Enterprise için fiyat özeldir. */
export function adPriceFor(product: AdProduct, planKey: PlanKey): AdPrice {
  const discount = getPlan(planKey).adDiscountPercent;
  if (discount === null) return { custom: true, base: product.startingDailyPrice };
  const final = Math.round(product.startingDailyPrice * (100 - discount)) / 100;
  return { custom: false, base: product.startingDailyPrice, discountPercent: discount, final };
}

export function formatAdPrice(price: AdPrice): string {
  if (price.custom) return "Özel fiyat";
  return `${price.final.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL/gün'den`;
}
