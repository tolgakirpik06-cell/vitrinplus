import { MarketplaceError } from "./errors";

/** Favori kuralları: kullanıcı başına ürün tek kez (veritabanı: unique(user_id, product_slug)). */
export function normalizeFavoriteSlug(slug: string): string {
  const value = slug.trim();
  if (value.length < 1 || value.length > 160) throw new MarketplaceError("INVALID_SLUG", "Ürün kimliği geçersiz.");
  return value;
}

export function isFavoriteDuplicate(existing: readonly string[], slug: string): boolean {
  const value = normalizeFavoriteSlug(slug);
  return existing.includes(value);
}

/** Aynı ürünü ikinci kez eklemek listeyi değiştirmez (hata da vermez: idempotent). */
export function addFavoriteSlug(existing: readonly string[], slug: string): string[] {
  const value = normalizeFavoriteSlug(slug);
  return existing.includes(value) ? [...existing] : [...existing, value];
}

export function removeFavoriteSlug(existing: readonly string[], slug: string): string[] {
  const value = normalizeFavoriteSlug(slug);
  return existing.filter((item) => item !== value);
}
