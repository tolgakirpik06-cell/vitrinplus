import type { Product, ProductRowConfig } from "@/types";

const MAX_ITEMS = 6;
/** Bir satırın "seyrek/boş" görünmemesi için hedeflenen en az ürün sayısı. */
const MIN_ITEMS = 3;

/**
 * Ana sayfadaki bir ürün satırı için gösterilecek ürünleri seçer.
 *
 * `excludeIds`, kendisinden HEMEN ÖNCE gösterilmiş satır(lar)da kullanılan
 * ürün id'lerini taşır — bu sayede art arda gelen iki bölüm birebir aynı
 * ürünleri tekrar etmez. Sadece 12 elle hazırlanmış (curated) ürün olduğu
 * ve bazı ürünler 3-4 etiketi birden taşıdığı için bir etiketin TÜM adayları
 * bir önceki satırda tüketilmiş olabilir; bu durumda satır tamamen boş
 * kalmasın diye (bkz. madde 19 — seyrek satır sorunu) daha önce kullanılmış
 * ürünlerle doldurulur. Böylece öncelik sırası: (1) hiç tekrar yok,
 * (2) tekrar var ama satır dolu — asla tamamen boş bir satır değil.
 */
export function selectRowProducts(
  products: Product[],
  config: ProductRowConfig,
  excludeIds: Set<string>
): Product[] {
  const candidates = products.filter((product) => product.tags.includes(config.tag));
  const fresh = candidates.filter((product) => !excludeIds.has(product.id)).slice(0, MAX_ITEMS);

  if (fresh.length >= MIN_ITEMS || fresh.length === candidates.length) {
    return fresh;
  }

  const backfill = candidates
    .filter((product) => !fresh.includes(product))
    .slice(0, MAX_ITEMS - fresh.length);

  return [...fresh, ...backfill];
}
