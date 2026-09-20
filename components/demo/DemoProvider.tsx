"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getProductBySlug } from "@/lib/mock-catalog";
import { emptyDemo, placeDemoOrder, shopProduct, transitionOrder, isSellable, type DemoState, type DemoShop, type DemoOrder, type DemoOrderStatus } from "@/lib/demo-marketplace";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import type { CartLine } from "@/types";

const KEY = STORAGE_KEYS.demo;
function useDemoState() {
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
  return { state, ready, storageError, user, shop, resolveProduct, login, apply, updateShop, checkout,
    logout: () => commit(previous => ({ ...previous, currentUserId: null })),
    review: (reference: string, status: "onaylandi" | "reddedildi") => commit(previous => ({ ...previous, shops: previous.shops.map(s => s.reference === reference && s.status === "bekliyor" ? { ...s, status } : s) })),
    changeOrder: (id: string, status: DemoOrderStatus, admin = false) => commit(previous => transitionOrder(previous, id, status, admin)),
    /** Satıcı panelindeki "Örnek veri yükle" için: verilen siparişleri (kimliği yeni olanları) demo kaydına ekler. */
    injectOrders: (orders: DemoOrder[]) => commit(previous => ({ ...previous, orders: [...orders.filter(order => !previous.orders.some(existing => existing.id === order.id)), ...previous.orders] })),
    /** Verilen kimlikteki siparişleri kaldırır (yalnızca örnek veri temizliği için). */
    removeOrders: (ids: string[]) => commit(previous => ({ ...previous, orders: previous.orders.filter(order => !ids.includes(order.id)) })),
  };
}
const DemoContext = createContext<ReturnType<typeof useDemoState> | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useDemoState();
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider gerekli");
  return value;
}
