/**
 * Tarayıcı depolama anahtarları için tek kaynak.
 *
 * Proje "PazarBuy" adıyla başlamıştı; bazı anahtarlar bu adla kaydedildi.
 * Kullanıcıların mevcut demo verisi (sepet, başvuru taslağı) kaybolmasın diye
 * eski anahtarlar doğrudan silinmez: okuma sırasında bulunursa yeni
 * VitrinPlus anahtarına taşınır, taşıma doğrulanınca eski anahtar kaldırılır.
 */
export const STORAGE_KEYS = {
  demo: "vitrinplus-demo-v1",
  cart: "vitrinplus-cart",
  coupon: "vitrinplus-coupon",
  favorites: "vitrinplus-favorites",
  sellerDraft: "vitrinplus:satici-basvuru-taslak",
  sellerSubmitted: "vitrinplus:satici-basvuru-gonderildi",
  sellerOps: "vitrinplus-seller-ops-v1",
  questions: "vitrinplus-questions-v1",
  sidebar: "vitrinplus-sidebar-v1",
} as const;

export const LEGACY_STORAGE_KEYS = {
  cart: "pazarbuy-cart",
  sellerDraft: "pazarbuy:satici-basvuru-taslak",
  sellerSubmitted: "pazarbuy:satici-basvuru-gonderildi",
} as const;

/**
 * Önce yeni anahtarı okur. Yoksa eski anahtara bakar; eski veri varsa yeni
 * anahtara kopyalar, kopya doğrulanırsa eski anahtarı siler ve veriyi döner.
 * Depolama erişilemezse (gizli mod, kota) sessizce null döner.
 */
export function readWithMigration(key: string, legacyKey?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const current = storage.getItem(key);
    if (current !== null) {
      // Yeni kayıt varsa eski kopya artık geçersizdir; tekrar taşınmasın.
      if (legacyKey && storage.getItem(legacyKey) !== null) storage.removeItem(legacyKey);
      return current;
    }
    if (!legacyKey) return null;
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) return null;
    try {
      storage.setItem(key, legacy);
      if (storage.getItem(key) === legacy) storage.removeItem(legacyKey);
    } catch {
      // Yazılamadıysa eski anahtar korunur; veri bu oturum için yine de döner.
    }
    return legacy;
  } catch {
    return null;
  }
}

/** Yeni ve (varsa) eski anahtarı birlikte siler; silinen taslak geri gelmesin. */
export function removeWithLegacy(key: string, legacyKey?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    if (legacyKey) window.localStorage.removeItem(legacyKey);
  } catch {
    // Depolama erişilemezse yapılacak bir şey yok.
  }
}
