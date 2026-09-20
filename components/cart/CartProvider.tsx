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
import type { CartLine } from "@/types";

const STORAGE_KEY = "pazarbuy-cart";

function buildLineId(slug: string, variantLabel?: string) {
  return variantLabel ? `${slug}::${variantLabel}` : slug;
}

type AddItemInput = {
  slug: string;
  quantity?: number;
  variantLabel?: string;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  addItem: (input: AddItemInput) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  coupon: string | null;
  setCoupon: (value: string | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // localStorage sadece client'ta mevcut olduğu için ilk render'da boş
  // state ile başlıyoruz, gerçek veriyi mount sonrası useEffect'te okuyoruz.
  // Bu sayede sunucu/istemci arasında hydration uyuşmazlığı oluşmaz.
  useEffect(() => {
    try {
      const savedCoupon = window.localStorage.getItem("vitrinplus-coupon");
      // Restore browser-only coupon after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCoupon === "VITRINPLUS10") setCoupon(savedCoupon);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        // İlk istemci yüklemesinde localStorage ile senkronize oluyoruz;
        // SSR hydration sonrasında bu state güncellemesi zorunlu.

        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      // localStorage okunamazsa sepet boş başlar, uygulama çalışmaya devam eder.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // yazma başarısız olsa da uygulama akışı bozulmasın.
    }
  }, [lines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { if (coupon) localStorage.setItem("vitrinplus-coupon", coupon); else localStorage.removeItem("vitrinplus-coupon"); } catch { /* Coupon remains usable for this session. */ }
  }, [coupon, hydrated]);

  const addItem = useCallback(({ slug, quantity = 1, variantLabel }: AddItemInput) => {
    const lineId = buildLineId(slug, variantLabel);
    setLines((prev) => {
      const existing = prev.find((line) => line.lineId === lineId);
      if (existing) {
        return prev.map((line) =>
          line.lineId === lineId ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...prev, { lineId, slug, quantity, variantLabel }];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((line) => line.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.lineId !== lineId);
      return prev.map((line) => (line.lineId === lineId ? { ...line, quantity } : line));
    });
  }, []);

  const clear = useCallback(() => { setLines([]); setCoupon(null); }, []);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, count, addItem, removeItem, updateQuantity, clear, coupon, setCoupon }),
    [lines, count, addItem, removeItem, updateQuantity, clear, coupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart, CartProvider içinde kullanılmalıdır.");
  return ctx;
}
