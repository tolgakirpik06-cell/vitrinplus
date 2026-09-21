/**
 * Görsel yükleme doğrulaması (SAF). Sunucu tarafındaki sınırlar supabase/migrations/0006_storage.sql ile aynıdır:
 * MIME türü jpeg / png / webp, boyut sınırı (ürün ve mağaza 5 MB, avatar 2 MB) ve uzantı.
 * Bu kontrol kullanıcı deneyimi içindir (erken, anlaşılır hata); asıl güvenlik depolama politikalarındadır.
 */
import { MarketplaceError } from "@/lib/domain/errors";

export type BucketName = "product-images" | "store-assets" | "avatars";

export const ALLOWED_IMAGE_TYPES: Readonly<Record<string, string>> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const BUCKET_MAX_BYTES: Readonly<Record<BucketName, number>> = { "product-images": 5_242_880, "store-assets": 5_242_880, avatars: 2_097_152 };

export function extensionFor(mime: string): string | null {
  return ALLOWED_IMAGE_TYPES[mime.toLowerCase()] ?? null;
}

export function validateImage(file: { type: string; size: number }, bucket: BucketName): string {
  const extension = extensionFor(file.type);
  if (!extension) throw new MarketplaceError("INVALID_IMAGE_TYPE", "Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new MarketplaceError("INVALID_IMAGE", "Görsel boş veya okunamadı.");
  const max = BUCKET_MAX_BYTES[bucket];
  if (file.size > max) throw new MarketplaceError("IMAGE_TOO_LARGE", `Görsel en fazla ${Math.round(max / 1_048_576)} MB olabilir.`);
  return extension;
}

/** "data:image/jpeg;base64,…" → tür + bayt sayısı + baytlar. Base64 olmayan / desteklenmeyen veri reddedilir. */
export function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return { mime: match[1], bytes };
  } catch {
    return null;
  }
}

/** Depolama yolu: {klasör}/{alt klasör?}/{uuid}.{uzantı}. İlk parça mağaza / kullanıcı kimliğidir (politika buna bakar). */
export function buildObjectPath(parts: readonly string[], id: string, extension: string): string {
  const safe = parts.map((part) => part.replace(/[^a-zA-Z0-9-]/g, ""));
  if (safe.some((part) => !part)) throw new MarketplaceError("INVALID_PATH", "Geçersiz yükleme yolu.");
  return `${safe.join("/")}/${id}.${extension}`;
}

/** Genel URL'den depolama yolunu çıkarır (silme için). */
export function storagePathFromPublicUrl(url: string, bucket: BucketName): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}
