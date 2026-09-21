import type { StorageRepository, UploadedImage } from "@/lib/repositories/types";
import { MarketplaceError } from "@/lib/domain/errors";
import { buildObjectPath, parseDataUrl, storagePathFromPublicUrl, validateImage, type BucketName } from "@/lib/storage/validate";
import type { Client } from "./common";

async function upload(client: Client, bucket: BucketName, parts: readonly string[], file: Blob, extension: string, options: { upsert?: boolean; fileId?: string } = {}): Promise<UploadedImage> {
  const ext = validateImage({ type: file.type, size: file.size }, bucket);
  const path = buildObjectPath(parts, options.fileId ?? crypto.randomUUID(), extension || ext);
  const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: options.upsert ?? false });
  if (error) throw new MarketplaceError("UPLOAD_FAILED", "Görsel yüklenemedi. Dosya türünü ve boyutunu kontrol edip tekrar dene.");
  return { path, url: client.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export function createStorageRepository(client: Client): StorageRepository {
  return {
    uploadProductImage: (storeId, productId, file, extension) => upload(client, "product-images", [storeId, productId], file, extension),
    // Logo / kapak tek dosyadır; aynı ada yazılır (upsert), böylece eski dosya birikmez.
    uploadStoreAsset: (storeId, kind, file, extension) => upload(client, "store-assets", [storeId], file, extension, { upsert: true, fileId: kind }),
    uploadAvatar: (userId, file, extension) => upload(client, "avatars", [userId], file, extension, { upsert: true, fileId: "avatar" }),
    async removeObjects(bucket, paths) {
      if (!paths.length) return;
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) throw new MarketplaceError("REMOVE_FAILED", "Dosya silinemedi.");
    },
  };
}

/** Veri URL'sini (yerel görsel) yükler; hatalı biçimde MarketplaceError fırlatır. */
export async function uploadDataUrlImage(repository: StorageRepository, storeId: string, productId: string, dataUrl: string): Promise<UploadedImage> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new MarketplaceError("INVALID_IMAGE", "Görsel biçimi geçersiz.");
  const extension = validateImage({ type: parsed.mime, size: parsed.bytes.byteLength }, "product-images");
  return repository.uploadProductImage(storeId, productId, new Blob([parsed.bytes.buffer as ArrayBuffer], { type: parsed.mime }), extension);
}

export { storagePathFromPublicUrl };
