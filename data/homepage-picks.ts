import { products } from "@/data/products";
import type { Product } from "@/types";

function pick(slugs: string[]): Product[] {
  return slugs.map((slug) => products.find((product) => product.slug === slug)).filter(
    (product): product is Product => Boolean(product)
  );
}

/** Ana sayfa "Günün Öne Çıkanları" bölümü — kategori çeşitliliği için elle seçildi. */
export const dailyHighlightProducts: Product[] = pick([
  "iphone-15-pro-max",
  "adidas-ultraboost",
  "macbook-air-m3",
  "philips-airfryer-xxl",
  "apple-watch-s9",
  "galaxy-tab-s9",
]);

/** Ana sayfa "Sana Özel Seçimler" bölümü — kategori çeşitliliği için elle seçildi. */
export const personalPickProducts: Product[] = pick([
  "gamepower-warlock",
  "xiaomi-robot-vacuum",
  "galaxy-s24-ultra",
  "sony-wh1000xm5",
  "nike-air-force-1",
  "loreal-elixir-parfum",
]);
