import { products } from "@/data/products";
import type { Product } from "@/types";

/**
 * Ana sayfa hero'sunun "Süper Fırsatlar" vitrininde gösterilecek ürünler.
 * Telefon / kulaklık / laptop / akıllı saat / parfüm gibi farklı kategorilerden,
 * indirimli ve tanıdık ürünler seçildi — hepsi gerçek /urun/[slug] sayfasına
 * gider ve gerçek fiyat/indirim bilgisiyle gösterilir.
 */
const HERO_SHOWCASE_SLUGS = [
  "galaxy-s24-ultra",
  "sony-wh1000xm5",
  "macbook-air-m3",
  "apple-watch-s9",
  "loreal-elixir-parfum",
];

export const heroShowcaseProducts: Product[] = HERO_SHOWCASE_SLUGS.map((slug) =>
  products.find((product) => product.slug === slug)
).filter((product): product is Product => Boolean(product));
