"use client";

/**
 * Pazaryeri bağlamı (context) sözleşmesi.
 *
 * İki sağlayıcı aynı sözleşmeyi uygular, böylece Aşama 1 ekranları (useDemo) değişmeden çalışır:
 *  - `DemoProvider`: tarayıcı (localStorage) demo modu — Supabase ortam değişkenleri yoksa,
 *  - `SupabaseMarketplaceProvider`: gerçek hesap / veri modu.
 * Ekranlar `mode` alanına bakarak yalnızca gerektiğinde ayrışır (ör. giriş formu, ödeme, finans).
 */
import { createContext, useContext } from "react";
import type { AppRole } from "@/lib/auth/paths";
import type { DemoOrderStatus, DemoOrder, DemoShop, DemoState, DemoUser } from "@/lib/demo-marketplace";
import type { PlanKey } from "@/lib/plans";
import type { Services } from "@/lib/services";
import type { Page } from "@/lib/repositories/types";
import type { SellerApplicationData } from "@/types/seller-application";
import type { OrderMeta } from "@/lib/seller-ops";
import type { CartLine, Product } from "@/types";
import type { DbSellerStatus, ShipTo } from "@/types/database";

export type MarketplaceMode = "demo" | "supabase";

/** Satıcı panelindeki değişikliklerin sunucuya yazılma durumu (yalnızca Supabase modunda anlamlı). */
export type SyncState = { status: "idle" | "syncing" | "error"; pending: number; error: string | null };

export type OrderExtra = { carrier?: string; tracking?: string };
export type OrderDetailsPatch = { carrier?: string; tracking?: string; notes?: string };

export type SellerAccountInfo = { accountId: string; storeId: string; status: DbSellerStatus; reference: string; rejectionReason: string | null; plan: PlanKey; storeName: string };

/** E-posta + şifre ve OAuth. Gerçek oturum yalnızca Supabase'in yanıtıyla açılır; sahte başarı yoktur. */
export type AuthApi = {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** `needsEmailConfirmation`: hesap oluşturuldu ama giriş için e-posta doğrulaması gerekiyor. */
  signUpWithPassword: (input: { name: string; email: string; password: string; next?: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithOAuth: (provider: "google" | "apple", next?: string) => Promise<void>;
};

export type PlaceOrderInput = { lines: CartLine[]; shipTo: ShipTo; billingAddress: string; coupon: string | null; express: boolean; idempotencyKey: string; note?: string };
export type PlacedOrderSummary = { duplicate: boolean; orderNos: string[]; total: number };

export type MarketplaceValue = {
  mode: MarketplaceMode;
  state: DemoState;
  ready: boolean;
  storageError: string;
  user: DemoUser | null;
  shop: DemoShop | undefined;
  /** Yalnızca Supabase modunda dolu. Demo modunda `null`. */
  role: AppRole | null;
  sellerAccount: SellerAccountInfo | null;
  /** Yapılandırma sorunu (ör. gizli anahtarın yanlışlıkla genel değişkene konması). */
  configProblem: string | null;
  sync: SyncState;
  retrySync: () => void;
  /** Sunucuya yazılamayan değişiklikleri bırakır ve sunucudaki onaylı duruma döner. */
  discardUnsynced: () => void;
  /** Sunucudan yayınlanan ürün listesi (Supabase). Demo modunda boş; demo ürünler `state.shops` içindedir. */
  catalog: Product[];
  /** Sipariş numarası → sunucudaki gerçek olay / kargo verisi (Supabase). Demo modunda boş. */
  serverOrderMeta: Record<string, OrderMeta>;
  services: Services;
  auth: AuthApi;
  refresh: () => Promise<void>;
  resolveProduct: (slug: string) => Product | undefined;
  /** Yayındaki ürünlerde sunucu tarafı arama + sayfalama (Supabase). Demo modunda boş sayfa döner; demo katalog `state.shops` üzerinden süzülür. */
  searchCatalog: (options: { query?: string; page?: number; pageSize?: number }) => Promise<Page<Product>>;
  /** Sunucudan eksik ürünleri getirir (sepet, favoriler, ürün sayfası). Demo modunda hiçbir şey yapmaz. */
  ensureProducts: (slugs: readonly string[], options?: { force?: boolean }) => Promise<void>;
  login: (email: string, name?: string) => void;
  apply: (storeName: string, description?: string) => string;
  /** Supabase modunda başvuruyu kalıcı olarak kaydeder (hassas alanlar ayıklanır). */
  submitSellerApplication: (input: { storeName: string; description: string; plan: PlanKey; application: SellerApplicationData }) => Promise<string>;
  changePlan: (plan: PlanKey) => Promise<void>;
  updateShop: (change: (store: DemoShop) => DemoShop) => void;
  checkout: (lines: CartLine[], details: { address: string; billingAddress: string; coupon: string | null; express: boolean }) => string;
  placeOrder: (input: PlaceOrderInput) => Promise<PlacedOrderSummary>;
  logout: () => void | Promise<void>;
  review: (reference: string, status: "onaylandi" | "reddedildi") => void;
  changeOrder: (id: string, status: DemoOrderStatus, admin?: boolean, extra?: OrderExtra) => void;
  /** Etiket basıldı → sipariş "kargoya hazır" (yalnızca Supabase modunda sunucuya yazılır). */
  markReadyToShip: (id: string) => void;
  saveOrderDetails: (id: string, details: OrderDetailsPatch) => void;
  injectOrders: (orders: DemoOrder[]) => void;
  removeOrders: (ids: string[]) => void;
};

export const MarketplaceContext = createContext<MarketplaceValue | null>(null);

export function useMarketplace(): MarketplaceValue {
  const value = useContext(MarketplaceContext);
  if (!value) throw new Error("DemoProvider veya SupabaseMarketplaceProvider gerekli");
  return value;
}
