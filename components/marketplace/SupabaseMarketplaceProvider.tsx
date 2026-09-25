"use client";

/**
 * Gerçek hesap / veri modu sağlayıcısı (Supabase yapılandırıldığında kullanılır).
 *
 * Aşama 1 ekranları `useDemo()` ile aynı sözleşmeyi (MarketplaceValue) görür; farklar bu dosyada saklıdır:
 *  - Kimlik: Supabase Auth (e-posta + şifre, OAuth). Sahte başarı yoktur; oturum yalnızca Supabase yanıtıyla açılır.
 *  - Satıcı paneli: değişiklikler ekranda hemen görünür (iyimser), sunucuya SIRAYLA yazılır (SyncQueue).
 *    Yazma başarısız olursa kuyruk durur, kullanıcı "tekrar dene" ya da "vazgeç" der; sessiz veri kaybı olmaz.
 *  - Sipariş: fiyat / stok / yetki kararı veritabanındaki `place_order` fonksiyonundadır; istemci yalnızca ister.
 *  - Yetki: arayüzü gizlemek güvenlik değildir; her işlem RLS ve SECURITY DEFINER fonksiyonlarınca yeniden denetlenir.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MarketplaceContext, type AuthApi, type MarketplaceValue, type OrderDetailsPatch, type OrderExtra, type PlaceOrderInput, type PlacedOrderSummary, type SellerAccountInfo, type SyncState } from "@/components/marketplace/context";
import { friendlyAuthError, validateSignIn, validateSignUp } from "@/lib/auth/credentials";
import { safeNextPath } from "@/lib/auth/paths";
import { transitionOrder as transitionDemoOrder, type DemoOrderStatus, type DemoShop, type DemoState } from "@/lib/demo-marketplace";
import { sanitizeApplication } from "@/lib/domain/application";
import { sellerTypeOf } from "@/lib/domain/application-detail";
import { MarketplaceError, friendlyError } from "@/lib/domain/errors";
import { demoToDbStatus } from "@/lib/domain/order-engine";
import { DEFAULT_PLAN_KEY, isPlanKey, type PlanKey } from "@/lib/plans";
import { createAccountRepository } from "@/lib/repositories/supabase/account";
import { createAdminRepository } from "@/lib/repositories/supabase/admin";
import { searchPublicProducts, getPublicProducts } from "@/lib/repositories/supabase/catalog";
import { createFinanceRepository } from "@/lib/repositories/supabase/finance";
import { guestRepository } from "@/lib/repositories/supabase/guest";
import { idFromProductSlug } from "@/lib/repositories/supabase/mappers";
import { placeOrder as placeServerOrder, transitionOrder as transitionServerOrder, updateOrderDetails } from "@/lib/repositories/supabase/orders";
import { createQuestionsRepository } from "@/lib/repositories/supabase/questions";
import { createReturnsRepository } from "@/lib/repositories/supabase/returns";
import { createSellerDocumentsRepository, discardSellerDocumentUploads, registerSellerDocuments, uploadSellerDocumentFiles } from "@/lib/repositories/supabase/seller-documents";
import { pushShopPlan } from "@/lib/repositories/supabase/seller";
import { changeSellerPlan, loadSessionData, submitApplication, type SessionData } from "@/lib/repositories/supabase/session";
import { createStockRepository } from "@/lib/repositories/supabase/stock";
import { createStorageRepository } from "@/lib/repositories/supabase/storage";
import { isEmptyPlan, planShopChanges, replaceImageUrls } from "@/lib/repositories/shop-diff";
import type { AccountRepository, ReturnsRepository } from "@/lib/repositories/types";
import { getProductBySlug } from "@/lib/mock-catalog";
import { createServices, type Services } from "@/lib/services";
import { SyncQueue } from "@/lib/sync-queue";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { Product } from "@/types";

const IDLE: SyncState = { status: "idle", pending: 0, error: null };
const REFRESH_INTERVAL_MS = 60_000;
const FOCUS_REFRESH_MIN_MS = 15_000;
const LOGOUT_WAIT_MS = 8_000;

const noSession = (message: string) => async (): Promise<never> => {
  throw new MarketplaceError("CONFIG", message);
};

/** Depoda kalıcı görsel adresine çevrilen (yüklenen) yerel görseller: sıradaki işler eski adları tanır. */
type ImageMap = Map<string, string>;

export function SupabaseMarketplaceProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getBrowserClient(), []);
  const [authReady, setAuthReady] = useState(client === null);
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [sync, setSync] = useState<SyncState>(IDLE);

  const dataRef = useRef<SessionData | null>(null);
  const queueRef = useRef<SyncQueue | null>(null);
  const mutationRef = useRef(0);
  const imagesRef = useRef<ImageMap>(new Map());
  const lastRefreshRef = useRef(0);
  const productsRef = useRef<Record<string, Product>>({});
  /** Satışta olmadığı öğrenilen ürünler: zorla yenilenene kadar tekrar sorgulanmaz. */
  const unavailableRef = useRef<Set<string>>(new Set());
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  /** Ekrandaki (iyimser) durumu günceller. Olay işleyicilerinden çağrılır; ref anında güncel olur. */
  const commit = useCallback((next: SessionData | null) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // ── Oturum ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!client) return;
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (dataRef.current && dataRef.current.userId !== id) {
        queueRef.current?.clear();
        imagesRef.current.clear();
        dataRef.current = null;
        setData(null);
      }
      setUserId(id);
      setAuthReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, [client]);

  // ── Kuyruk ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const queue = new SyncQueue(setSync, () => {
      void refreshRef.current();
    });
    queueRef.current = queue;
    return () => {
      queueRef.current = null;
    };
  }, []);

  // ── Kullanıcı verisi ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!client || !userId) return;
    let active = true;
    loadSessionData(client, userId).then(
      (next) => {
        if (!active) return;
        commit(next);
        setLoadError("");
      },
      (error: unknown) => {
        if (active) setLoadError(friendlyError(error));
      },
    );
    return () => {
      active = false;
    };
  }, [client, userId, commit]);

  // ── Herkese açık katalog ──────────────────────────────────────────────────
  const mergeProducts = useCallback((list: readonly Product[]) => {
    if (!list.length) return;
    setProducts((previous) => {
      const next = { ...previous };
      for (const product of list) next[product.slug] = product;
      return next;
    });
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    searchPublicProducts(client, { pageSize: 48 }).then(
      (page) => {
        if (!active) return;
        setCatalog(page.items);
        mergeProducts(page.items);
      },
      (error: unknown) => {
        if (active) setLoadError(friendlyError(error));
      },
    );
    return () => {
      active = false;
    };
  }, [client, mergeProducts]);

  const session = data && data.userId === userId ? data : null;
  const user = session?.user ?? null;
  const shop = session?.shop;
  const orders = session?.orders;
  const role = session?.role ?? null;
  const identity = session?.identity ?? null;

  // ── Yenileme ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!client) return;
    lastRefreshRef.current = Date.now();
    const current = dataRef.current;
    const pending = queueRef.current?.snapshot().pending ?? 0;
    const tasks: Promise<void>[] = [
      searchPublicProducts(client, { pageSize: 48 }).then((page) => {
        setCatalog(page.items);
        mergeProducts(page.items);
      }),
    ];
    if (current && pending === 0) {
      const version = mutationRef.current;
      tasks.push(
        loadSessionData(client, current.userId).then((next) => {
          // Yükleme sürerken kullanıcı bir değişiklik yaptıysa eski sonucu uygulama; kuyruk boşalınca yeniden yenilenir.
          if (mutationRef.current !== version || dataRef.current?.userId !== next.userId) return;
          commit(next);
        }),
      );
    }
    try {
      await Promise.all(tasks);
      setLoadError("");
    } catch (error) {
      setLoadError(friendlyError(error));
    }
  }, [client, commit, mergeProducts]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Sekmeye dönünce ve düzenli aralıkla tazele (yeni siparişler, stok, onay durumu).
  useEffect(() => {
    if (!client) return;
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefreshRef.current >= FOCUS_REFRESH_MIN_MS) void refreshRef.current();
    };
    const interval = window.setInterval(tick, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [client]);

  // Kaydedilmemiş değişiklik varken sekmeyi kapatmaya karşı uyarı.
  useEffect(() => {
    if (sync.status === "idle") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sync.status]);

  // ── Ürün çözümleme ────────────────────────────────────────────────────────
  const resolveProduct = useCallback(
    (slug: string): Product | undefined => {
      const live = products[slug];
      if (live) return live;
      // Gerçek mağaza ürünü (demo-<uuid>) katalogda yoksa satışta değildir; statik örnek katalog yalnızca gösterim içindir.
      if (idFromProductSlug(slug) !== null || slug.startsWith("demo-")) return undefined;
      return getProductBySlug(slug) ?? undefined;
    },
    [products],
  );

  const ensureProducts = useCallback(
    async (slugs: readonly string[], options: { force?: boolean } = {}) => {
      if (!client) return;
      const wanted = Array.from(new Set(slugs.filter((slug) => idFromProductSlug(slug) !== null)));
      const missing = options.force ? wanted : wanted.filter((slug) => !productsRef.current[slug] && !unavailableRef.current.has(slug));
      if (!missing.length) return;
      try {
        const fetched = await getPublicProducts(client, missing);
        const found = new Set(fetched.map((product) => product.slug));
        for (const slug of missing) if (!found.has(slug)) unavailableRef.current.add(slug);
        for (const slug of found) unavailableRef.current.delete(slug);
        setProducts((previous) => {
          const next = { ...previous };
          // Satıştan kalkan ürün önbellekte kalmasın.
          for (const slug of missing) if (!found.has(slug)) delete next[slug];
          for (const product of fetched) next[product.slug] = product;
          return next;
        });
      } catch (error) {
        // Çağıran (useEnsureProducts) hatayı gösterir; ağ hatası "ürün satışta değil" diye yorumlanmamalı.
        throw error;
      }
    },
    [client],
  );

  const searchCatalog = useCallback(
    async (options: { query?: string; page?: number; pageSize?: number }) => {
      if (!client) return { items: [], total: 0 };
      const page = await searchPublicProducts(client, options);
      mergeProducts(page.items);
      return page;
    },
    [client, mergeProducts],
  );

  // ── Servisler ─────────────────────────────────────────────────────────────
  const storeId = identity?.store.id ?? null;
  const storeName = identity?.store.name ?? "";
  const services = useMemo<Services>(() => {
    if (!client) {
      return createServices({ returns: guestRepository<ReturnsRepository>(), questions: guestRepository(), account: guestRepository<AccountRepository>() });
    }
    return createServices({
      returns: userId ? createReturnsRepository(client, { userId, storeId }) : guestRepository<ReturnsRepository>(),
      questions: createQuestionsRepository(client, { storeId }),
      account: userId ? createAccountRepository(client, { userId }) : guestRepository<AccountRepository>(),
      finance: storeId ? createFinanceRepository(client, { storeId, storeName }) : undefined,
      stock: storeId ? createStockRepository(client, { storeId }) : undefined,
      admin: role === "admin" ? createAdminRepository(client) : undefined,
      sellerDocuments: userId ? createSellerDocumentsRepository(client, { userId }) : undefined,
    });
  }, [client, userId, storeId, storeName, role]);

  // ── Kimlik ────────────────────────────────────────────────────────────────
  const auth = useMemo<AuthApi>(() => {
    if (!client) {
      const fail = noSession("Supabase yapılandırması eksik olduğu için giriş yapılamıyor.");
      return { signInWithPassword: fail, signUpWithPassword: fail, signInWithOAuth: fail };
    }
    return {
      async signInWithPassword(email, password) {
        const problem = validateSignIn({ email, password });
        if (problem) throw new MarketplaceError("INVALID_CREDENTIALS_FORMAT", problem);
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new MarketplaceError("AUTH", friendlyAuthError(error));
      },
      async signUpWithPassword({ name, email, password, next }) {
        const problem = validateSignUp({ name, email, password });
        if (problem) throw new MarketplaceError("INVALID_CREDENTIALS_FORMAT", problem);
        const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
        const { data: result, error } = await client.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: redirect } });
        if (error) throw new MarketplaceError("AUTH", friendlyAuthError(error));
        // Oturum yoksa e-posta doğrulaması bekleniyor: giriş yapılmış GİBİ davranılmaz.
        return { needsEmailConfirmation: !result.session };
      },
      async signInWithOAuth(provider, next) {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
        const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw new MarketplaceError("AUTH", friendlyAuthError(error));
      },
    };
  }, [client]);

  const logout = useCallback(async () => {
    if (!client) return;
    const queue = queueRef.current;
    if (queue && queue.snapshot().pending > 0) {
      const idle = await queue.whenIdle(LOGOUT_WAIT_MS);
      if (!idle) throw new MarketplaceError("UNSYNCED", "Kaydedilmemiş değişikliklerin var. Önce değişikliklerin kaydedilmesini bekle ya da vazgeç, sonra çıkış yap.");
    }
    const { error } = await client.auth.signOut();
    if (error) throw new MarketplaceError("AUTH", friendlyAuthError(error));
  }, [client]);

  // ── Satıcı başvurusu / paket ──────────────────────────────────────────────
  const submitSellerApplication = useCallback<MarketplaceValue["submitSellerApplication"]>(
    async (input) => {
      const current = dataRef.current;
      if (!client || !current) throw new MarketplaceError("AUTH_REQUIRED", "Başvuru için giriş yapmalısın.");
      // 1) Belge dosyaları özel depolamaya yüklenir (geçersiz dosya varsa başvuru hiç gönderilmez).
      const uploads = await uploadSellerDocumentFiles(client, current.userId, input.documents ?? {});
      let reference: string;
      try {
        reference = await submitApplication(client, { storeName: input.storeName.trim(), description: input.description, plan: input.plan, application: sanitizeApplication(input.application) });
      } catch (error) {
        await discardSellerDocumentUploads(client, uploads);
        throw error;
      }
      // 2) Başvuru kaydedildi; belge kaydı bundan sonra yapılır. Bu adım başarısız olursa başvuru geçerli kalır ve satıcı
      //    eksik belgeleri başvuru durumu sayfasından yeniden yükleyebilir (orada "Yüklenmedi" olarak görünür).
      if (uploads.length) {
        try {
          await registerSellerDocuments(client, uploads);
        } catch {
          await discardSellerDocumentUploads(client, uploads);
        }
      }
      await refreshRef.current();
      return reference;
    },
    [client],
  );

  const changePlan = useCallback(
    async (plan: PlanKey) => {
      if (!client) throw new MarketplaceError("CONFIG", "Supabase yapılandırması eksik.");
      await changeSellerPlan(client, plan);
      await refreshRef.current();
    },
    [client],
  );

  // ── Mağaza değişiklikleri (iyimser + sıralı yazma) ─────────────────────────
  const updateShop = useCallback(
    (change: (store: DemoShop) => DemoShop) => {
      const current = dataRef.current;
      if (!client || !current || !current.identity || !current.shop || current.shop.status !== "onaylandi") throw new Error("Onaylanmış mağaza gerekli.");
      const before = current.shop;
      const after = change(before);
      if (after === before) return;
      mutationRef.current += 1;
      commit({ ...current, shop: after });
      const owner = current.userId;
      const storeIdForJob = current.identity.store.id;
      queueRef.current?.enqueue("Mağaza değişikliği", async () => {
        const prev = replaceImageUrls(before, imagesRef.current);
        const next = replaceImageUrls(after, imagesRef.current);
        const plan = planShopChanges(prev, next);
        if (isEmptyPlan(plan)) return;
        const uploaded = await pushShopPlan(client, { userId: owner, storeId: storeIdForJob, storage: createStorageRepository(client) }, plan, prev);
        if (uploaded.size) {
          for (const [dataUrl, url] of uploaded) imagesRef.current.set(dataUrl, url);
          const latest = dataRef.current;
          if (latest?.shop) {
            mutationRef.current += 1;
            commit({ ...latest, shop: replaceImageUrls(latest.shop, uploaded) });
          }
        }
      });
    },
    [client, commit],
  );

  const retrySync = useCallback(() => queueRef.current?.retry(), []);
  const discardUnsynced = useCallback(() => {
    queueRef.current?.clear();
    imagesRef.current.clear();
    mutationRef.current += 1;
    void refreshRef.current();
  }, []);

  // ── Siparişler ────────────────────────────────────────────────────────────
  const toState = useCallback((source: SessionData): DemoState => ({ version: 1, users: [source.user], currentUserId: source.userId, shops: source.shop ? [source.shop] : [], orders: source.orders.orders, sold: {} }), []);

  const changeOrder = useCallback(
    (id: string, status: DemoOrderStatus, admin = false, extra: OrderExtra = {}) => {
      const current = dataRef.current;
      if (!client || !current) throw new Error("Giriş yapmalısın.");
      const serverId = current.orders.idByNo[id];
      if (!serverId) throw new Error("Sipariş bulunamadı.");
      // Aynı kural kümesi (durum grafiği, yetki, stok iadesi) saf fonksiyonla hemen uygulanır; sunucu yine de yeniden denetler.
      const next = transitionDemoOrder(toState(current), id, status, admin);
      mutationRef.current += 1;
      commit({ ...current, shop: next.shops[0] ?? current.shop, orders: { ...current.orders, orders: next.orders } });
      queueRef.current?.enqueue("Sipariş durumu", () => transitionServerOrder(client, serverId, demoToDbStatus[status], { carrier: extra.carrier, tracking: extra.tracking }));
    },
    [client, commit, toState],
  );

  const markReadyToShip = useCallback(
    (id: string) => {
      const current = dataRef.current;
      if (!client || !current) throw new Error("Giriş yapmalısın.");
      const serverId = current.orders.idByNo[id];
      if (!serverId) throw new Error("Sipariş bulunamadı.");
      queueRef.current?.enqueue("Kargoya hazır", () => transitionServerOrder(client, serverId, "ready_to_ship"));
    },
    [client],
  );

  const saveOrderDetails = useCallback(
    (id: string, details: OrderDetailsPatch) => {
      const current = dataRef.current;
      if (!client || !current) throw new Error("Giriş yapmalısın.");
      const serverId = current.orders.idByNo[id];
      if (!serverId) throw new Error("Sipariş bulunamadı.");
      const known = current.orders.metaByNo[id];
      const payload = { carrier: details.carrier ?? known?.carrier ?? "", tracking: details.tracking ?? known?.tracking ?? "", note: details.notes ?? known?.notes ?? "" };
      queueRef.current?.enqueue("Sipariş bilgileri", () => updateOrderDetails(client, serverId, payload));
    },
    [client],
  );

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<PlacedOrderSummary> => {
      if (!client || !dataRef.current) throw new MarketplaceError("AUTH_REQUIRED", "Sipariş vermek için giriş yapmalısın.");
      const lines = input.lines.map((line) => {
        const productId = idFromProductSlug(line.slug);
        if (!productId) throw new MarketplaceError("NOT_ORDERABLE", "Sepetindeki örnek katalog ürünleri gerçek modda sipariş edilemez. Mağaza ürünlerini sepete ekle.");
        return { productId, variantLabel: line.variantLabel ?? null, quantity: line.quantity };
      });
      const result = await placeServerOrder(client, lines, { shipTo: input.shipTo, billingAddress: input.billingAddress, coupon: input.coupon, express: input.express, note: input.note }, input.idempotencyKey);
      await refreshRef.current();
      return { duplicate: result.duplicate, orderNos: result.orders.map((order) => order.orderNo), total: Math.round(result.orders.reduce((sum, order) => sum + order.total, 0) * 100) / 100 };
    },
    [client],
  );

  const unsupported = useCallback((): never => {
    throw new MarketplaceError("UNSUPPORTED", "Bu işlem gerçek hesap modunda kullanılamaz.");
  }, []);

  const state = useMemo<DemoState>(() => ({ version: 1, users: user ? [user] : [], currentUserId: user?.id ?? null, shops: shop ? [shop] : [], orders: orders?.orders ?? [], sold: {} }), [user, shop, orders]);

  const sellerAccount = useMemo<SellerAccountInfo | null>(
    () =>
      identity
        ? { accountId: identity.account.id, storeId: identity.store.id, status: identity.account.status, reference: identity.account.reference, rejectionReason: identity.account.rejection_reason, reviewedAt: identity.account.reviewed_at, sellerType: sellerTypeOf(identity.account.application), plan: isPlanKey(identity.account.selected_plan) ? identity.account.selected_plan : DEFAULT_PLAN_KEY, storeName: identity.store.name }
        : null,
    [identity],
  );

  const ready = authReady && (userId === null || session !== null || loadError !== "");

  const value = useMemo<MarketplaceValue>(
    () => ({
      mode: "supabase",
      state,
      ready,
      storageError: loadError,
      user,
      signedIn: userId !== null,
      shop,
      role,
      sellerAccount,
      configProblem: client ? null : "Supabase yapılandırması eksik veya geçersiz.",
      sync,
      retrySync,
      discardUnsynced,
      catalog,
      serverOrderMeta: orders?.metaByNo ?? {},
      services,
      auth,
      refresh,
      resolveProduct,
      ensureProducts,
      searchCatalog,
      login: unsupported,
      apply: unsupported,
      submitSellerApplication,
      changePlan,
      updateShop,
      checkout: unsupported,
      placeOrder,
      logout,
      review: unsupported,
      changeOrder,
      markReadyToShip,
      saveOrderDetails,
      injectOrders: unsupported,
      removeOrders: unsupported,
    }),
    [state, ready, loadError, user, userId, shop, role, sellerAccount, client, sync, retrySync, discardUnsynced, catalog, orders, services, auth, refresh, resolveProduct, ensureProducts, searchCatalog, unsupported, submitSellerApplication, changePlan, updateShop, placeOrder, logout, changeOrder, markReadyToShip, saveOrderDetails],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

