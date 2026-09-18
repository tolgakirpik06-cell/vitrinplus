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

const STORAGE_KEY = "vitrinplus-favorites";

type FavoritesContextValue = {
  slugs: string[];
  count: number;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  removeFavorite: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // localStorage sadece client'ta mevcut olduğu için ilk render'da boş
  // state ile başlıyoruz, gerçek veriyi mount sonrası useEffect'te okuyoruz
  // (CartProvider ile aynı desen — sunucu/istemci hydration uyuşmazlığı olmasın diye).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        // İlk istemci yüklemesinde localStorage ile senkronize oluyoruz.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setSlugs(parsed);
      }
    } catch {
      // localStorage okunamazsa favoriler boş başlar, uygulama çalışmaya devam eder.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      // yazma başarısız olsa da uygulama akışı bozulmasın.
    }
  }, [slugs, hydrated]);

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggleFavorite = useCallback((slug: string) => {
    setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }, []);

  const count = slugs.length;

  const value = useMemo(
    () => ({ slugs, count, isFavorite, toggleFavorite, removeFavorite }),
    [slugs, count, isFavorite, toggleFavorite, removeFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites, FavoritesProvider içinde kullanılmalıdır.");
  return ctx;
}
