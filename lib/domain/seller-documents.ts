/**
 * Satıcı belgeleri: SAF kurallar (yükleme doğrulaması, yol biçimi, zorunlu belge listesi).
 * Sunucu tarafı karşılığı supabase/migrations/0007_seller_documents.sql'dedir (kova sınırları, yol kalıbı, politikalar);
 * buradaki kontroller kullanıcı deneyimi içindir (erken, anlaşılır hata) — asıl güvenlik veritabanı ve depolama politikalarındadır.
 */
import { MarketplaceError } from "@/lib/domain/errors";
import { sellerDocumentConfig, slugifyStoreName } from "@/lib/seller-application";
import type { SellerDocumentKey } from "@/types/seller-application";

export type { SellerDocumentKey };

export const SELLER_DOCUMENT_BUCKET = "seller-documents";
export const SELLER_DOCUMENT_MAX_BYTES = 10_485_760;
/** İmzalı adresin (signed URL) geçerlilik süresi: belge açılırken üretilir, kısa sürede geçersizleşir. */
export const SELLER_DOCUMENT_URL_TTL_SECONDS = 60;

export const SELLER_DOCUMENT_MIME_EXTENSIONS: Readonly<Record<string, string>> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

export const SELLER_DOCUMENT_KEYS: readonly SellerDocumentKey[] = sellerDocumentConfig.map((doc) => doc.key);

export function isSellerDocumentKey(value: unknown): value is SellerDocumentKey {
  return typeof value === "string" && (SELLER_DOCUMENT_KEYS as readonly string[]).includes(value);
}

export function documentLabel(key: SellerDocumentKey): string {
  return sellerDocumentConfig.find((doc) => doc.key === key)?.label ?? key;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tarayıcının bildirdiği tür (MIME) izinli mi? Uzantı döner; değilse anlaşılır hata fırlatır. */
export function validateSellerDocument(file: { type: string; size: number }): string {
  const extension = SELLER_DOCUMENT_MIME_EXTENSIONS[file.type.toLowerCase()];
  if (!extension) throw new MarketplaceError("INVALID_DOCUMENT_TYPE", "Yalnızca PDF, JPG veya PNG belge yüklenebilir.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new MarketplaceError("INVALID_DOCUMENT", "Dosya boş veya okunamadı.");
  if (file.size > SELLER_DOCUMENT_MAX_BYTES) throw new MarketplaceError("DOCUMENT_TOO_LARGE", `Belge en fazla ${Math.round(SELLER_DOCUMENT_MAX_BYTES / 1_048_576)} MB olabilir.`);
  return extension;
}

/**
 * Dosyanın gerçek içeriğine (ilk baytlar) bakarak türünü belirler. Tarayıcının bildirdiği tür kolayca sahtelenebilir;
 * bu kontrol "uzantısı .pdf ama içi başka bir şey" olan dosyaları yükleme öncesinde ayıklar.
 */
export function sniffSellerDocumentMime(bytes: Uint8Array): string | null {
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (bytes.length >= 5 && startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (bytes.length >= 3 && startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 8 && startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Depolama yolu: {kullanıcı uuid}/{belge türü}/{dosya uuid}.{uzantı}. Politika (0007) aynı kalıbı zorlar. */
export function buildSellerDocumentPath(userId: string, docType: SellerDocumentKey, fileId: string, extension: string): string {
  const id = userId.toLowerCase();
  const file = fileId.toLowerCase();
  if (!UUID.test(id) || !UUID.test(file) || !isSellerDocumentKey(docType) || !Object.values(SELLER_DOCUMENT_MIME_EXTENSIONS).includes(extension)) {
    throw new MarketplaceError("INVALID_PATH", "Geçersiz belge yolu.");
  }
  return `${id}/${docType}/${file}.${extension}`;
}

/** SQL `is_seller_document_path` ile aynı kalıp. */
export function isSellerDocumentPath(path: string): boolean {
  const match = /^([0-9a-f-]{36})\/([A-Za-z]+)\/([0-9a-f-]{36})\.(pdf|jpg|jpeg|png)$/.exec(path);
  return match !== null && UUID.test(match[1]) && isSellerDocumentKey(match[2]) && UUID.test(match[3]);
}

// ─── Zorunlu belge listesi ──────────────────────────────────────────────────

/** Satıcı tipine göre zorunlu belgeler (form ve doğrulama ile aynı kaynak: sellerDocumentConfig). Tip bilinmiyorsa her tipte gerekenler. */
export function requiredDocumentKeys(sellerType: string | null | undefined): SellerDocumentKey[] {
  if (sellerType === "sahis" || sellerType === "limited-as") return sellerDocumentConfig.filter((doc) => doc.sellerTypes.includes(sellerType)).map((doc) => doc.key);
  return sellerDocumentConfig.filter((doc) => doc.sellerTypes.length === 2).map((doc) => doc.key);
}

export type UploadedDocumentInfo = { id: string; docType: SellerDocumentKey; name: string; mimeType: string; sizeBytes: number; uploadedAt: string };

export type DocumentChecklistItem = {
  key: SellerDocumentKey;
  label: string;
  description: string;
  required: boolean;
  /** Yüklenmiş dosya; yoksa `null` ("Yüklenmedi"). */
  document: UploadedDocumentInfo | null;
};

export type DocumentChecklist = { items: DocumentChecklistItem[]; requiredCount: number; uploadedRequiredCount: number; missingLabels: string[]; complete: boolean };

/**
 * Zorunlu belgeleri yüklenenlerle eşleştirir. Zorunlu listede olmayan ama yüklenmiş belgeler (ör. satıcı tipi sonradan
 * farklı görünüyorsa) "isteğe bağlı" olarak yine gösterilir; yüklenmiş hiçbir belge gizlenmez.
 */
export function buildDocumentChecklist(sellerType: string | null | undefined, uploaded: readonly UploadedDocumentInfo[]): DocumentChecklist {
  const required = requiredDocumentKeys(sellerType);
  const byType = new Map(uploaded.map((doc) => [doc.docType, doc]));
  const keys: SellerDocumentKey[] = [...required, ...uploaded.map((doc) => doc.docType).filter((key) => !required.includes(key))];
  const items = keys.map((key): DocumentChecklistItem => {
    const config = sellerDocumentConfig.find((doc) => doc.key === key);
    return { key, label: config?.label ?? key, description: config?.description ?? "", required: required.includes(key), document: byType.get(key) ?? null };
  });
  const requiredItems = items.filter((item) => item.required);
  const missingLabels = requiredItems.filter((item) => !item.document).map((item) => item.label);
  return { items, requiredCount: requiredItems.length, uploadedRequiredCount: requiredItems.length - missingLabels.length, missingLabels, complete: missingLabels.length === 0 };
}

/** İndirilen dosyaya verilecek ad: belge türü + uzantı (özgün dosya adı yol/karakter dolanımı taşıyabilir). */
export function safeDownloadName(label: string, mimeType: string): string {
  const extension = SELLER_DOCUMENT_MIME_EXTENSIONS[mimeType] ?? "bin";
  return `${slugifyStoreName(label) || "belge"}.${extension}`;
}
