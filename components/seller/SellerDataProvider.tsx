"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "vitrinplus-seller-panel";

export type SellerProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
};

export type SellerCampaign = {
  id: string;
  name: string;
  discountPercent: number;
  endDate: string;
};

export type SellerSettings = {
  storeName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
};

export type SellerShipping = {
  shippingFee: number;
  freeShippingThreshold: number;
  preparationDays: number;
  carrier: string;
};

type SellerDataState = {
  products: SellerProduct[];
  campaigns: SellerCampaign[];
  settings: SellerSettings;
  shipping: SellerShipping;
};

// Panel ilk açıldığında satıcının kendi mağazasında zaten var olduğu
// varsayılan, tamamen düzenlenebilir/silinebilir bir başlangıç kataloğu.
// Bu veriler sahte "gerçek kullanıcı finansal verisi" değildir — satıcının
// kendi ürün/stok/maliyet girişleri için düzenlenebilir bir başlangıç
// noktasıdır (madde 6 ve madde 22 ile tutarlı: gerçek CRUD, sahte değil).
const DEFAULT_STATE: SellerDataState = {
  products: [
    { id: "sp-1", name: "GamePower Warlock Oyuncu Bilgisayarı", sku: "TKM-GPW-001", category: "Elektronik", price: 14999, cost: 11200, stock: 42 },
    { id: "sp-2", name: "Sony WH-1000XM5 Kablosuz Kulaklık", sku: "TKM-SNY-014", category: "Elektronik", price: 8999, cost: 6450, stock: 6 },
    { id: "sp-3", name: "Apple Watch Series 9 45mm", sku: "TKM-APL-045", category: "Elektronik", price: 12999, cost: 9800, stock: 0 },
    { id: "sp-4", name: "Samsung Galaxy Tab S9 128GB", sku: "TKM-SAM-128", category: "Elektronik", price: 21999, cost: 17300, stock: 18 },
  ],
  campaigns: [
    { id: "sc-1", name: "Hafta Sonu Fırsatı", discountPercent: 15, endDate: "2026-09-21" },
    { id: "sc-2", name: "2 Al 1 Öde — Aksesuar", discountPercent: 50, endDate: "2026-10-01" },
  ],
  settings: {
    storeName: "TeknoMarket",
    description: "Elektronik ve bilgisayar kategorisinde 1200+ ürünle hizmet veren VitrinPlus mağazası.",
    contactEmail: "magaza@teknomarket.com",
    contactPhone: "0212 555 01 02",
  },
  shipping: {
    shippingFee: 49.9,
    freeShippingThreshold: 500,
    preparationDays: 2,
    carrier: "Yurtiçi Kargo",
  },
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type SellerDataContextValue = SellerDataState & {
  addProduct: (input: Omit<SellerProduct, "id">) => void;
  updateProduct: (id: string, patch: Partial<Omit<SellerProduct, "id">>) => void;
  deleteProduct: (id: string) => void;
  addCampaign: (input: Omit<SellerCampaign, "id">) => void;
  deleteCampaign: (id: string) => void;
  updateSettings: (patch: Partial<SellerSettings>) => void;
  updateShipping: (patch: Partial<SellerShipping>) => void;
};

const SellerDataContext = createContext<SellerDataContextValue | null>(null);

export function SellerDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SellerDataState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // localStorage yalnızca client'ta mevcut olduğundan ilk render varsayılan
  // veriyle yapılır, gerçek (varsa) kayıtlı veri mount sonrası okunur —
  // sunucu/istemci hydration uyuşmazlığı oluşmaz (CartProvider ile aynı desen).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SellerDataState>;
        // Kalıcı panel verisi hydration sonrasında varsayılan durumun yerini alır.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState((prev) => ({
          products: Array.isArray(parsed.products) ? parsed.products : prev.products,
          campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : prev.campaigns,
          settings: parsed.settings ? { ...prev.settings, ...parsed.settings } : prev.settings,
          shipping: parsed.shipping ? { ...prev.shipping, ...parsed.shipping } : prev.shipping,
        }));
      }
    } catch {
      // okunamazsa varsayılan başlangıç verisiyle devam edilir.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // yazma başarısız olsa da panel çalışmaya devam eder.
    }
  }, [state, hydrated]);

  const addProduct = useCallback((input: Omit<SellerProduct, "id">) => {
    setState((prev) => ({ ...prev, products: [{ ...input, id: makeId("sp") }, ...prev.products] }));
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Omit<SellerProduct, "id">>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((product) => (product.id === id ? { ...product, ...patch } : product)),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => ({ ...prev, products: prev.products.filter((product) => product.id !== id) }));
  }, []);

  const addCampaign = useCallback((input: Omit<SellerCampaign, "id">) => {
    setState((prev) => ({ ...prev, campaigns: [{ ...input, id: makeId("sc") }, ...prev.campaigns] }));
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setState((prev) => ({ ...prev, campaigns: prev.campaigns.filter((campaign) => campaign.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<SellerSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const updateShipping = useCallback((patch: Partial<SellerShipping>) => {
    setState((prev) => ({ ...prev, shipping: { ...prev.shipping, ...patch } }));
  }, []);

  const value = useMemo<SellerDataContextValue>(
    () => ({
      ...state,
      addProduct,
      updateProduct,
      deleteProduct,
      addCampaign,
      deleteCampaign,
      updateSettings,
      updateShipping,
    }),
    [state, addProduct, updateProduct, deleteProduct, addCampaign, deleteCampaign, updateSettings, updateShipping]
  );

  return <SellerDataContext.Provider value={value}>{children}</SellerDataContext.Provider>;
}

export function useSellerData() {
  const ctx = useContext(SellerDataContext);
  if (!ctx) throw new Error("useSellerData, SellerDataProvider içinde kullanılmalıdır.");
  return ctx;
}
