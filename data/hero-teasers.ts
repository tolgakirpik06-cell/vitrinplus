import { products } from "@/data/products";
import type { Product } from "@/types";

/**
 * Ana sayfa hero'sunun sol alt kısmındaki "Flaş Ürünler" şeridinde
 * gösterilecek ürünler. Sadece GERÇEK indirimi olan (oldPrice/discount
 * dolu) ürünler seçildi ki şerit gerçek bir fırsat vitrini olsun, jenerik
 * bir reklam kartı değil. Farklı kategorilerden (kulaklık/akıllı saat/
 * parfüm) ve gerçek /urun/[slug] sayfasına giden ürünler.
 */
const HERO_TEASER_SLUGS = ["sony-wh1000xm5", "apple-watch-s9", "loreal-elixir-parfum"];

export const heroTeaserProducts: Product[] = HERO_TEASER_SLUGS.map((slug) =>
  products.find((product) => product.slug === slug)
).filter((product): product is Product => Boolean(product));
