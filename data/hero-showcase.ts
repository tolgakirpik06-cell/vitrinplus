import type { Product } from "@/types";

/**
 * Ana sayfa hero'sunun "Süper Fırsatlar" vitrininde gösterilecek ürünler.
 * Telefon / kulaklık / laptop / akıllı saat / parfüm gibi farklı kategorilerden,
 * Yalnızca canlı katalogdaki izin verilen slug'lar seçilir; eksik ürünler
 * atlanır ve başka satıcı ürünleriyle doldurulmaz.
 */
export const HERO_SHOWCASE_SLUGS = [
  "galaxy-s24-ultra",
  "sony-wh1000xm5",
  "macbook-air-m3",
  "apple-watch-s9",
  "loreal-elixir-parfum",
] as const;

export function selectHeroShowcaseProducts(products: readonly Product[]): Product[] {
  return HERO_SHOWCASE_SLUGS.map((slug) =>
    products.find((product) => product.slug === slug)
  ).filter((product): product is Product => Boolean(product));
}
