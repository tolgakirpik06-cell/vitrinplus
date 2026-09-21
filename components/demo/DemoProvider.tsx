"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getProductBySlug } from "@/lib/mock-catalog";
import { emptyDemo, placeDemoOrder, restockProduct, shopProduct, transitionOrder, isSellable, type DemoState, type DemoShop, type DemoOrder, type DemoOrderStatus } from "@/lib/demo-marketplace";
import { MarketplaceError } from "@/lib/domain/errors";
import { createDemoAccountRepository } from "@/lib/repositories/demo/account";
import { createDemoQuestionsRepository } from "@/lib/repositories/demo/questions";
import { createDemoReturnsRepository } from "@/lib/repositories/demo/returns";
import { createServices } from "@/lib/services";
import { setOwnerPlan } from "@/lib/seller-ops";
import type { PlanKey } from "@/lib/plans";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import type { CartLine } from "@/types";
import { MarketplaceContext, useMarketplace, type AuthApi, type MarketplaceValue, type SyncState } from "@/components/marketplace/context";

const KEY = STORAGE_KEYS.demo;
const IDLE_SYNC: SyncState = { status: "idle", pending: 0, error: null };
const UNSUPPORTED = "Bu işlem yalnızca gerçek hesap (Supabase) modunda kullanılabilir.";
const demoAuth: AuthApi = {
  signInWithPassword: async () => { throw new MarketplaceError("UNSUPPORTED", UNSUPPORTED); },
  signUpWithPassword: async () => { throw new MarketplaceError("UNSUPPORTED", UNSUPPORTED); },
  signInWithOAuth: async () => { throw new MarketplaceError("UNSUPPORTED", UNSUPPORTED); },
};
/** Kalıcı demo kaydındaki siparişler (iade deposu güncel veriyi doğrudan depolamadan okur). */
function readPersistedOrders(): readonly DemoOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as DemoState) : null;
    return saved && Array.isArray(saved.orders) ? saved.orders : [];
  } catch { return []; }
}
const noop = () => undefined;
const noopAsync = async () => undefined;

type DemoServicesInput = {
  userId: string | null;
  userName: string;
  userEmail: string;
  storeName: string | null;
  /** Demo kaydına eşzamanlı yazan işlem; yalnızca stok geri ekleme gibi olay anlarında çağrılır, render sırasında değil. */
  commit: (change: (previous: DemoState) => DemoState) => void;
  resolveProduct: MarketplaceValue["resolveProduct"];
};

/**
 * Demo modu servisleri (iade, soru, hesap). `commit` en güncel kaydı bir ref üzerinden okuduğu için
 * `react-hooks/refs` kuralı onu render sırasında çağrılan bir fonksiyona (depo oluşturucuya) doğrudan geçirmeyi
 * reddeder. Servisler bu yüzden ayrı bir hook'ta, `commit` sıradan bir bağımlılık olarak alınarak oluşturulur;
 * `commit` yalnızca iade stoğa geri eklendiğinde (olay anında) çağrılır.
 */
function useDemoServices({ userId, userName, userEmail, storeName, commit, resolveProduct }: DemoServicesInput) {
  return useMemo(() => createServices({
    returns: createDemoReturnsRepository({ userId, userName, getOrders: readPersistedOrders, onRestock: (slug, quantity) => commit(previous => restockProduct(previous, slug, quantity)) }),
    questions: createDemoQuestionsRepository({ storeName, customerName: userName, resolveProduct }),
    account: createDemoAccountRepository({ user: { id: userId ?? "misafir", email: userEmail, name: userName } }),
  }), [userId, userName, userEmail, storeName, commit, resolveProduct]);
}

function useDemoState(configProblem: string | null): MarketplaceValue {
  const [state, setState] = useState<DemoState>(emptyDemo);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const current = useRef(state);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as DemoState;
        if (saved.version !== 1 || !Array.isArray(saved.users) || !Array.isArray(saved.shops) || !Array.isArray(saved.orders) || !saved.sold) throw new Error("Geçersiz demo kaydı");
        current.current = saved;
        // Browser persistence is restored only after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(saved);
      }
    } catch { setStorageError("Demo kaydı okunamadı. Tarayıcı depolama ayarlarını kontrol et."); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY || !event.newValue) return;
      try { const saved = JSON.parse(event.newValue) as DemoState; if (saved.version === 1) { current.current = saved; setState(saved); } } catch { /* Keep the last valid state. */ }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const commit = useCallback((change: (previous: DemoState) => DemoState) => {
    if (!ready) throw new Error("Demo yükleniyor, lütfen bekle.");
    // Read the latest persisted snapshot before each synchronous transaction.
    let previous = current.current;
    const raw = localStorage.getItem(KEY);
    if (raw) previous = JSON.parse(raw) as DemoState;
    const next = change(previous);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error("Demo kaydedilemedi. Tarayıcı depolama alanını kontrol et."); }
    current.current = next;
    setState(next);
    setStorageError("");
  }, [ready]);
  const user = state.users.find(u => u.id === state.currentUserId) ?? null;
  const shop = state.shops.find(s => s.ownerId === user?.id);
  const resolveProduct = useCallback((slug: string) => {
    for (const store of state.shops) {
      const product = store.products.find(p => `demo-${p.id}` === slug);
      if (product && store.status === "onaylandi") return isSellable(product) ? shopProduct(product, store) : undefined;
    }
    const product = getProductBySlug(slug);
    return product ? { ...product, stock: Math.max(0, product.stock - (state.sold[slug] ?? 0)) } : undefined;
  }, [state.shops, state.sold]);
  const userId = user?.id ?? null;
  const userName = user?.name ?? "";
  const userEmail = user?.email ?? "";
  const storeName = shop?.settings.storeName ?? null;
  const services = useDemoServices({ userId, userName, userEmail, storeName, commit, resolveProduct });
  function login(email: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Geçerli bir demo e-posta adresi yaz.");
    commit(previous => {
      const found = previous.users.find(u => u.email === normalized);
      if (name !== undefined && found) throw new Error("Bu demo hesabı zaten var. Giriş yapabilirsin.");
      if (!found && !name?.trim()) throw new Error("Bu tarayıcıda hesap bulunamadı. Önce demo hesabı oluştur.");
      const account = found ?? { id: crypto.randomUUID(), email: normalized, name: name!.trim() };
      return { ...previous, users: found ? previous.users : [...previous.users, account], currentUserId: account.id };
    });
  }
  function apply(storeName: string, description = "") {
    const reference = `VP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    commit(previous => {
      if (!previous.currentUserId) throw new Error("Önce demo hesabına giriş yap.");
      if (storeName.trim().length < 3) throw new Error("Mağaza adı en az 3 karakter olmalı.");
      if (previous.shops.some(s => s.ownerId === previous.currentUserId && s.status !== "reddedildi")) throw new Error("Zaten bir mağaza başvurun var.");
      const store: DemoShop = { ownerId: previous.currentUserId, reference, status: "bekliyor", products: [], campaigns: [], settings: { storeName: storeName.trim(), description, contactEmail: previous.users.find(u => u.id === previous.currentUserId)!.email, contactPhone: "" }, shipping: { shippingFee: 49.9, freeShippingThreshold: 250, preparationDays: 2, carrier: "Demo Kargo" } };
      return { ...previous, shops: [...previous.shops.filter(s => s.ownerId !== previous.currentUserId), store] };
    });
    return reference;
  }
  function updateShop(change: (store: DemoShop) => DemoShop) {
    commit(previous => {
      const store = previous.shops.find(s => s.ownerId === previous.currentUserId && s.status === "onaylandi");
      if (!store) throw new Error("Onaylanmış mağaza gerekli.");
      return { ...previous, shops: previous.shops.map(s => s === store ? change(s) : s) };
    });
  }
  function checkout(lines: CartLine[], details: Parameters<typeof placeDemoOrder>[3]) {
    const id = `VP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    commit(previous => placeDemoOrder(previous, lines, getProductBySlug, details, id).state);
    return id;
  }
  return { mode: "demo", state, ready, storageError, user, shop, resolveProduct, login, apply, updateShop, checkout,
    role: null, sellerAccount: null, configProblem, sync: IDLE_SYNC, retrySync: noop, discardUnsynced: noop, catalog: [], serverOrderMeta: {}, services, auth: demoAuth,
    refresh: noopAsync, ensureProducts: noopAsync, searchCatalog: async () => ({ items: [], total: 0 }), markReadyToShip: noop, saveOrderDetails: noop,
    submitSellerApplication: async (input) => { const reference = apply(input.storeName, input.description); if (user) setOwnerPlan(user.id, input.plan); return reference; },
    changePlan: async (plan: PlanKey) => { if (user) setOwnerPlan(user.id, plan); },
    placeOrder: async () => { throw new MarketplaceError("UNSUPPORTED", UNSUPPORTED); },
    logout: () => commit(previous => ({ ...previous, currentUserId: null })),
    review: (reference: string, status: "onaylandi" | "reddedildi") => commit(previous => ({ ...previous, shops: previous.shops.map(s => s.reference === reference && s.status === "bekliyor" ? { ...s, status } : s) })),
    changeOrder: (id: string, status: DemoOrderStatus, admin = false) => commit(previous => transitionOrder(previous, id, status, admin)),
    /** Satıcı panelindeki "Örnek veri yükle" için: verilen siparişleri (kimliği yeni olanları) demo kaydına ekler. */
    injectOrders: (orders: DemoOrder[]) => commit(previous => ({ ...previous, orders: [...orders.filter(order => !previous.orders.some(existing => existing.id === order.id)), ...previous.orders] })),
    /** Verilen kimlikteki siparişleri kaldırır (yalnızca örnek veri temizliği için). */
    removeOrders: (ids: string[]) => commit(previous => ({ ...previous, orders: previous.orders.filter(order => !ids.includes(order.id)) })),
  };
}
export function DemoProvider({ children, configProblem = null }: { children: ReactNode; configProblem?: string | null }) {
  const value = useDemoState(configProblem);
  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}
/** Aşama 1'den beri kullanılan kanca; hangi sağlayıcı seçilirse seçilsin aynı bağlamı döndürür. */
export const useDemo = useMarketplace;
