/**
 * Satıcı belgeleri — ÖZEL `seller-documents` kovası (bkz. supabase/migrations/0007_seller_documents.sql).
 *  - Dosyalar {kullanıcı_id}/{belge_türü}/{uuid}.{uzantı} yoluna yüklenir; kova herkese açık DEĞİLDİR, herkese açık URL üretilmez.
 *  - Görüntüleme/indirme yalnızca kısa ömürlü (60 sn) imzalı adresle olur; adresi üretme yetkisini depolama politikaları verir
 *    (satıcı yalnızca kendi klasörü, yönetici tüm kova).
 *  - Belge kaydı yalnızca `register_seller_documents` RPC'siyle yazılır.
 */
import { MarketplaceError } from "@/lib/domain/errors";
import {
  SELLER_DOCUMENT_BUCKET,
  SELLER_DOCUMENT_KEYS,
  SELLER_DOCUMENT_URL_TTL_SECONDS,
  buildSellerDocumentPath,
  documentLabel,
  isSellerDocumentKey,
  safeDownloadName,
  sniffSellerDocumentMime,
  validateSellerDocument,
  type SellerDocumentKey,
  type UploadedDocumentInfo,
} from "@/lib/domain/seller-documents";
import type { SellerDocumentFiles, SellerDocumentsRepository } from "@/lib/repositories/types";
import { callRpc, first, rows, unwrap, type Client } from "./common";

export type PendingUpload = { docType: SellerDocumentKey; path: string; name: string; mime: string; size: number };

type DocumentRow = { id: string; doc_type: string; original_name: string; mime_type: string; size_bytes: number; uploaded_at: string };

export function mapDocument(row: DocumentRow): UploadedDocumentInfo | null {
  if (!isSellerDocumentKey(row.doc_type)) return null;
  return { id: row.id, docType: row.doc_type, name: row.original_name, mimeType: row.mime_type, sizeBytes: row.size_bytes, uploadedAt: row.uploaded_at };
}

export const DOCUMENT_COLUMNS = "id, doc_type, original_name, mime_type, size_bytes, uploaded_at";

/** Dosyayı doğrular (tür, boyut, gerçek içerik) ve özel kovaya yükler. Bir dosya başarısız olursa öncekiler geri alınır. */
export async function uploadSellerDocumentFiles(client: Client, userId: string, files: SellerDocumentFiles): Promise<PendingUpload[]> {
  const entries = SELLER_DOCUMENT_KEYS.flatMap((key) => (files[key] ? [[key, files[key] as File] as const] : []));
  const done: PendingUpload[] = [];
  try {
    for (const [docType, file] of entries) {
      const extension = validateSellerDocument({ type: file.type, size: file.size });
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const sniffed = sniffSellerDocumentMime(head);
      if (sniffed !== file.type.toLowerCase()) throw new MarketplaceError("INVALID_DOCUMENT_TYPE", `${documentLabel(docType)}: dosya içeriği seçilen türle uyuşmuyor. Geçerli bir PDF, JPG veya PNG seç.`);
      const path = buildSellerDocumentPath(userId, docType, crypto.randomUUID(), extension);
      const { error } = await client.storage.from(SELLER_DOCUMENT_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "0", upsert: false });
      if (error) throw new MarketplaceError("UPLOAD_FAILED", `${documentLabel(docType)} yüklenemedi. Dosyayı ve bağlantını kontrol edip tekrar dene.`);
      done.push({ docType, path, name: file.name.slice(0, 200) || `${docType}.${extension}`, mime: file.type.toLowerCase(), size: file.size });
    }
    return done;
  } catch (error) {
    await discardSellerDocumentUploads(client, done);
    throw error;
  }
}

/** Yüklenmiş ama kayda bağlanmamış dosyaları siler (en iyi çaba; bağsız dosyayı politika zaten silmeye izin verir). */
export async function discardSellerDocumentUploads(client: Client, uploads: readonly PendingUpload[]): Promise<void> {
  if (!uploads.length) return;
  await client.storage.from(SELLER_DOCUMENT_BUCKET).remove(uploads.map((upload) => upload.path)).catch(() => undefined);
}

/** Belge kaydını oluşturur ve değiştirilen eski dosyaları depolamadan siler. */
export async function registerSellerDocuments(client: Client, uploads: readonly PendingUpload[]): Promise<void> {
  if (!uploads.length) return;
  const result = await callRpc(client, "register_seller_documents", { p_documents: uploads.map((upload) => ({ doc_type: upload.docType, path: upload.path, name: upload.name, mime: upload.mime, size: upload.size })) });
  const replaced = typeof result === "object" && result !== null ? (result as { replaced_paths?: unknown }).replaced_paths : null;
  const oldPaths = Array.isArray(replaced) ? replaced.filter((item): item is string => typeof item === "string") : [];
  if (oldPaths.length) await client.storage.from(SELLER_DOCUMENT_BUCKET).remove(oldPaths).catch(() => undefined);
}

/** Belge kimliğinden imzalı adres üretir. Kayıt ve dosya erişimi RLS / depolama politikalarıyla denetlenir. */
export async function signDocumentUrl(client: Client, documentId: string, mode: "view" | "download"): Promise<string> {
  const row = first<{ storage_path: string; doc_type: string; mime_type: string }>(unwrap(await client.from("seller_documents").select("storage_path, doc_type, mime_type").eq("id", documentId).maybeSingle()));
  if (!row) throw new MarketplaceError("NOT_FOUND", "Belge bulunamadı ya da erişim iznin yok.");
  const filename = safeDownloadName(isSellerDocumentKey(row.doc_type) ? documentLabel(row.doc_type) : "belge", row.mime_type);
  const { data, error } = await client.storage.from(SELLER_DOCUMENT_BUCKET).createSignedUrl(row.storage_path, SELLER_DOCUMENT_URL_TTL_SECONDS, mode === "download" ? { download: filename } : undefined);
  if (error || !data?.signedUrl) throw new MarketplaceError("DOCUMENT_UNAVAILABLE", "Belge açılamadı. Dosya bulunamadı ya da erişim iznin yok.");
  return data.signedUrl;
}

export function createSellerDocumentsRepository(client: Client, ctx: { userId: string }): SellerDocumentsRepository {
  return {
    async list() {
      const data = rows<DocumentRow>(unwrap(await client.from("seller_documents").select(DOCUMENT_COLUMNS).eq("owner_id", ctx.userId).order("uploaded_at", { ascending: true })));
      return data.map(mapDocument).filter((doc): doc is UploadedDocumentInfo => doc !== null);
    },
    async upload(files) {
      const uploads = await uploadSellerDocumentFiles(client, ctx.userId, files);
      if (!uploads.length) throw new MarketplaceError("NO_FILES", "Yüklenecek dosya seçilmedi.");
      try {
        await registerSellerDocuments(client, uploads);
      } catch (error) {
        await discardSellerDocumentUploads(client, uploads);
        throw error;
      }
    },
    getUrl: (documentId, mode) => signDocumentUrl(client, documentId, mode),
  };
}
