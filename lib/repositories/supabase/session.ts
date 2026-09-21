/**
 * Oturum verisi: giriş yapan kullanıcının profili, (varsa) satıcı hesabı + mağazası ve siparişleri.
 * Tüm sorgular kullanıcının oturumuyla çalışır; ne görüneceğine RLS karar verir.
 */
import type { AppRole } from "@/lib/auth/paths";
import type { DemoShop, DemoUser } from "@/lib/demo-marketplace";
import type { SanitizedApplication } from "@/lib/domain/application";
import { MarketplaceError } from "@/lib/domain/errors";
import type { PlanKey } from "@/lib/plans";
import { createAccountRepository } from "./account";
import { callRpc, type Client } from "./common";
import { loadBuyerOrders, loadStoreOrders, mergeBundles, type OrderBundle } from "./orders";
import { loadSellerIdentity, loadShop, type SellerIdentity } from "./seller";

export type SessionData = {
  userId: string;
  user: DemoUser;
  role: AppRole;
  identity: SellerIdentity | null;
  shop: DemoShop | undefined;
  orders: OrderBundle;
};

export const EMPTY_ORDERS: OrderBundle = { orders: [], idByNo: {}, metaByNo: {} };

export async function loadSessionData(client: Client, userId: string): Promise<SessionData> {
  const profile = await createAccountRepository(client, { userId }).getProfile();
  const identity = await loadSellerIdentity(client, userId);
  const [shop, buyerOrders, storeOrders] = await Promise.all([
    identity ? loadShop(client, identity, profile.role) : Promise.resolve(undefined),
    loadBuyerOrders(client, userId),
    identity ? loadStoreOrders(client, identity.store.id) : Promise.resolve(EMPTY_ORDERS),
  ]);
  return {
    userId,
    user: { id: userId, email: profile.email, name: profile.fullName || profile.email.split("@")[0] || "Hesabım" },
    role: profile.role,
    identity,
    shop,
    orders: mergeBundles(buyerOrders, storeOrders),
  };
}

/** Satıcı başvurusunu kaydeder. Hassas alanlar (şifre, TC, doğum tarihi, tam IBAN) çağıran tarafından `sanitizeApplication` ile ayıklanmış olmalıdır. */
export async function submitApplication(client: Client, input: { storeName: string; description: string; plan: PlanKey; application: SanitizedApplication }): Promise<string> {
  const data = await callRpc(client, "submit_seller_application", { p_store_name: input.storeName, p_description: input.description, p_plan: input.plan, p_application: input.application });
  const reference = typeof data === "object" && data !== null ? (data as { reference?: unknown }).reference : null;
  if (typeof reference !== "string" || !reference) throw new MarketplaceError("APPLICATION_FAILED", "Başvuru kaydedilemedi. Lütfen tekrar dene.");
  return reference;
}

/** Paket değişimi: ürün sayısı yeni paketin limitini aşıyorsa veritabanı reddeder. */
export async function changeSellerPlan(client: Client, plan: PlanKey): Promise<void> {
  await callRpc(client, "set_seller_plan", { p_plan: plan });
}
