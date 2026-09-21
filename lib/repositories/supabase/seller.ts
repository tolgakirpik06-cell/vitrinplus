/**
 * Satıcının kendi mağazası: yükleme ve değişiklik yazma.
 * Tüm yazmalar kullanıcının oturumuyla, RLS ve kolon düzeyi yetkilerle yapılır; stok yalnızca adjust_stock RPC'si ile değişir.
 */
import type { DemoShop, SellerCampaign, SellerProduct } from "@/lib/demo-marketplace";
import type { AppRole } from "@/lib/auth/paths";
import { MarketplaceError } from "@/lib/domain/errors";
import { canManageProduct } from "@/lib/domain/product";
import { isLocalImage, toCostColumns, toProductColumns, type ShopPlan } from "@/lib/repositories/shop-diff";
import type { StorageRepository } from "@/lib/repositories/types";
import type { ProductCostRow, ProductImageRow, ProductRow, ProductVariantRow, SellerAccountRow, StoreCampaignRow, StoreRow } from "@/types/database";
import { callRpc, chunk, fetchAll, first, rows, unwrap, type Client } from "./common";
import { mapCampaign, mapSellerProduct, mapShop } from "./mappers";
import { storagePathFromPublicUrl, uploadDataUrlImage } from "./storage";

export type SellerIdentity = { account: SellerAccountRow; store: StoreRow };

export async function loadSellerIdentity(client: Client, userId: string): Promise<SellerIdentity | null> {
  const account = first<SellerAccountRow>(unwrap(await client.from("seller_accounts").select("*").eq("owner_id", userId).maybeSingle()));
  if (!account) return null;
  const store = first<StoreRow>(unwrap(await client.from("stores").select("*").eq("seller_account_id", account.id).maybeSingle()));
  return store ? { account, store } : null;
}

export async function loadSellerProducts(client: Client, storeId: string, actor: { id: string; role: AppRole }): Promise<SellerProduct[]> {
  const fetched = await fetchAll<ProductRow>((from, to) => client.from("products").select("*").eq("store_id", storeId).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to));
  // Derinlemesine savunma: RLS zaten yalnızca kendi ürünlerini döndürür; başka satıcıya ait bir satır gelse bile işlenmez.
  const products = fetched.filter((row) => canManageProduct(actor, { sellerId: row.seller_id }));
  if (!products.length) return [];
  const [costs, images, variants] = await Promise.all([
    fetchAll<ProductCostRow>((from, to) => client.from("product_costs").select("*").eq("store_id", storeId).range(from, to)),
    fetchAll<ProductImageRow>((from, to) => client.from("product_images").select("*").eq("store_id", storeId).range(from, to)),
    fetchAll<ProductVariantRow>((from, to) => client.from("product_variants").select("*").eq("store_id", storeId).range(from, to)),
  ]);
  const costBy = new Map(costs.map((cost) => [cost.product_id, cost]));
  const group = <T extends { product_id: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) map.set(item.product_id, [...(map.get(item.product_id) ?? []), item]);
    return map;
  };
  const imagesBy = group(images);
  const variantsBy = group(variants);
  return products.map((row) => mapSellerProduct(row, costBy.get(row.id), imagesBy.get(row.id) ?? [], variantsBy.get(row.id) ?? []));
}

export async function loadCampaigns(client: Client, storeId: string): Promise<SellerCampaign[]> {
  const data = rows<StoreCampaignRow>(unwrap(await client.from("store_campaigns").select("*").eq("store_id", storeId).order("created_at", { ascending: false })));
  return data.map(mapCampaign);
}

export async function loadShop(client: Client, identity: SellerIdentity, role: AppRole): Promise<DemoShop> {
  const actor = { id: identity.account.owner_id, role };
  const [products, campaigns] = await Promise.all([identity.store.is_active ? loadSellerProducts(client, identity.store.id, actor) : Promise.resolve([]), loadCampaigns(client, identity.store.id)]);
  return mapShop({ ownerId: identity.account.owner_id, reference: identity.account.reference, status: identity.account.status, store: identity.store, products, campaigns });
}

// ─── Yazma ──────────────────────────────────────────────────────────────────

export type PushContext = { userId: string; storeId: string; storage: StorageRepository; note?: string };

const STOCK_NOTE = "Satıcı panelinden stok güncellemesi";

async function insertImages(client: Client, ctx: PushContext, productId: string, dataUrls: readonly string[], firstOrder: number, replacements: Map<string, string>): Promise<void> {
  const inserts: { id: string; product_id: string; storage_path: string; url: string; alt: string; sort_order: number }[] = [];
  let order = firstOrder;
  for (const dataUrl of dataUrls) {
    if (!isLocalImage(dataUrl)) continue; // Kalıcı adresli görsel zaten kayıtlı.
    const uploaded = await uploadDataUrlImage(ctx.storage, ctx.storeId, productId, dataUrl);
    replacements.set(dataUrl, uploaded.url);
    inserts.push({ id: crypto.randomUUID(), product_id: productId, storage_path: uploaded.path, url: uploaded.url, alt: "", sort_order: order });
    order += 1;
  }
  if (inserts.length) unwrap(await client.from("product_images").insert(inserts));
}

async function createProducts(client: Client, ctx: PushContext, products: readonly SellerProduct[], replacements: Map<string, string>): Promise<void> {
  for (const batch of chunk(products, 50)) {
    const productRows = batch.map((product) => ({
      id: product.id,
      store_id: ctx.storeId,
      seller_id: ctx.userId,
      ...toProductColumns(product),
      // Varyantlı üründe toplam stok varyant stoklarından türer; çift "ilk stok" kaydı olmasın diye 0 ile başlar.
      stock: product.variants?.length ? 0 : product.stock,
    }));
    unwrap(await client.from("products").insert(productRows));
    unwrap(await client.from("product_costs").upsert(batch.map((product) => ({ product_id: product.id, ...toCostColumns(product) })), { onConflict: "product_id" }));
    const variantRows = batch.flatMap((product) =>
      (product.variants ?? []).map((variant, index) => ({ id: variant.id, product_id: product.id, label: variant.label.trim(), sku: variant.sku?.trim() || null, stock: variant.stock ?? 0, sort_order: index, is_active: true }))
    );
    if (variantRows.length) unwrap(await client.from("product_variants").insert(variantRows));
    for (const product of batch) await insertImages(client, ctx, product.id, product.images ?? [], 0, replacements);
  }
}

async function updateProduct(client: Client, ctx: PushContext, update: ShopPlan["productsUpdated"][number], replacements: Map<string, string>): Promise<void> {
  if (Object.keys(update.patch).length) unwrap(await client.from("products").update(update.patch).eq("id", update.id).eq("store_id", ctx.storeId));
  if (update.costs) unwrap(await client.from("product_costs").upsert({ product_id: update.id, ...update.costs }, { onConflict: "product_id" }));

  // Varyantlar
  if (update.variantsAdded.length) {
    unwrap(await client.from("product_variants").insert(update.variantsAdded.map((variant) => ({ id: variant.id, product_id: update.id, label: variant.label, sku: variant.sku, stock: variant.stock, sort_order: variant.sortOrder, is_active: true }))));
  }
  for (const id of update.variantsRemoved) unwrap(await client.from("product_variants").update({ is_active: false }).eq("id", id).eq("product_id", update.id));
  for (const change of update.variantsChanged) {
    const { id, sortOrder, ...rest } = change;
    const patch: Record<string, unknown> = { ...rest, ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}) };
    unwrap(await client.from("product_variants").update(patch).eq("id", id).eq("product_id", update.id));
  }
  for (const stock of update.variantStock) {
    await callRpc(client, "adjust_stock", { p_product_id: update.id, p_variant_id: stock.variantId, p_mode: "set", p_quantity: stock.to, p_note: ctx.note ?? STOCK_NOTE });
  }
  if (update.stock) await callRpc(client, "adjust_stock", { p_product_id: update.id, p_variant_id: null, p_mode: "set", p_quantity: update.stock.to, p_note: ctx.note ?? STOCK_NOTE });

  // Görseller: kaldır → yükle → sırala
  if (update.imagesRemoved.length || update.imagesAdded.length || update.imageOrder) {
    const current = rows<ProductImageRow>(unwrap(await client.from("product_images").select("*").eq("product_id", update.id)));
    const removedRows = current.filter((image) => update.imagesRemoved.includes(image.url));
    if (removedRows.length) {
      unwrap(await client.from("product_images").delete().in("id", removedRows.map((image) => image.id)));
      const paths = removedRows.map((image) => storagePathFromPublicUrl(image.url, "product-images") ?? image.storage_path);
      // Dosya silinemese bile kayıt kaldırıldığı için ürün doğru görünür; artık dosya zararsızdır.
      await ctx.storage.removeObjects("product-images", paths).catch(() => undefined);
    }
    await insertImages(client, ctx, update.id, update.imagesAdded, current.length - removedRows.length, replacements);
    if (update.imageOrder) {
      const finalOrder = update.imageOrder.map((url) => replacements.get(url) ?? url);
      const persisted = rows<ProductImageRow>(unwrap(await client.from("product_images").select("*").eq("product_id", update.id)));
      for (const [index, url] of finalOrder.entries()) {
        const row = persisted.find((image) => image.url === url);
        if (row && row.sort_order !== index) unwrap(await client.from("product_images").update({ sort_order: index }).eq("id", row.id));
      }
    }
  }
}

/**
 * Değişiklik planını sunucuya yazar. Yazma yetkisi kullanıcının kendi mağazasıyla sınırlıdır (RLS); ayrıca istemci tarafında
 * kimlik (seller/store) doğrulanır. Dönüş: yüklenen görseller için "veri URL'si → kalıcı adres" eşlemesi.
 */
export async function pushShopPlan(client: Client, ctx: PushContext, plan: ShopPlan, current: DemoShop): Promise<Map<string, string>> {
  const replacements = new Map<string, string>();
  // Kimlik manipülasyonuna karşı: yalnızca kendi mağazanın (yüklenmiş) ürünleri güncellenir / silinir.
  for (const id of [...plan.productsRemoved, ...plan.productsUpdated.map((update) => update.id)]) {
    if (!current.products.some((product) => product.id === id)) throw new MarketplaceError("FORBIDDEN", "Bu ürünü değiştirme yetkin yok.");
  }

  if (Object.keys(plan.storePatch).length) unwrap(await client.from("stores").update(plan.storePatch).eq("id", ctx.storeId));
  if (plan.campaignsRemoved.length) unwrap(await client.from("store_campaigns").delete().in("id", plan.campaignsRemoved).eq("store_id", ctx.storeId));
  if (plan.campaignsAdded.length) {
    unwrap(await client.from("store_campaigns").insert(plan.campaignsAdded.map((campaign) => ({ id: campaign.id, store_id: ctx.storeId, name: campaign.name.trim(), discount_percent: campaign.discountPercent, end_date: campaign.endDate }))));
  }
  if (plan.productsAdded.length) await createProducts(client, ctx, plan.productsAdded, replacements);
  for (const update of plan.productsUpdated) await updateProduct(client, ctx, update, replacements);
  if (plan.productsRemoved.length) {
    // Silme = yumuşak silme: kayıt ve sipariş geçmişi korunur, ürün satıştan kalkar.
    unwrap(await client.from("products").update({ deleted_at: new Date().toISOString(), status: "passive" }).in("id", plan.productsRemoved).eq("store_id", ctx.storeId));
  }
  return replacements;
}
