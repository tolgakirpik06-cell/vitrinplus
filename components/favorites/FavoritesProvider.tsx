"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { friendlyError } from "@/lib/domain/errors";

const STORAGE_KEY = "vitrinplus-favorites";

type FavoritesContextValue = {
  slugs: string[];
  count: number;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  removeFavorite: (slug: string) => void;
  /** Gerçek modda favorilerin sunucuya yazılamadığı son hata (yoksa null). */
  syncError: string | null;
  /** Liste kullanılabilir mi: misafirde yerel liste okundu, girişte sunucu listesi geldi (ya da hata döndü). */
  loaded: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type ServerFavorites = { userId: string; slugs: string[] };

/**
 * Favoriler.
 *  - Demo modu ve misafir: tarayıcıda (localStorage) saklanır.
 *  - Gerçek mod + oturum açık: hesaba bağlı olarak veritabanında saklanır (kullanıcı başına tek kayıt).
 *    Girişte misafir favorileri hesaba aktarılır; çıkışta yerel liste boşalır (ortak cihazda sızıntı olmaz).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { mode, user, services } = useMarketplace();
  const userId = mode === "supabase" ? (user?.id ?? null) : null;
  const [guestSlugs, setGuestSlugs] = useState<string[]>([]);
  const [server, setServer] = useState<ServerFavorites | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
        if (Array.isArray(parsed)) setGuestSlugs(parsed);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestSlugs));
    } catch {
      // yazma başarısız olsa da uygulama akışı bozulmasın.
    }
  }, [guestSlugs, hydrated]);

  const guestRef = useRef(guestSlugs);
  useEffect(() => {
    guestRef.current = guestSlugs;
  }, [guestSlugs]);

  // Giriş: sunucudaki favorileri getir, misafir favorilerini hesaba aktar.
  useEffect(() => {
    if (!hydrated || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await services.account.listFavorites();
        const carry = guestRef.current.filter((slug) => !remote.includes(slug)).slice(0, 100);
        let merged = remote;
        for (const slug of carry) merged = await services.account.addFavorite(slug);
        if (cancelled) return;
        setServer((previous) => ({ userId, slugs: Array.from(new Set([...merged, ...(previous?.userId === userId ? previous.slugs : [])])) }));
        if (carry.length > 0 || guestRef.current.length > 0) setGuestSlugs([]);
        setSyncError(null);
      } catch (error) {
        if (!cancelled) setSyncError(friendlyError(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, services]);

  const slugs = useMemo(() => (userId ? (server?.userId === userId ? server.slugs : []) : guestSlugs), [userId, server, guestSlugs]);
  const slugsRef = useRef(slugs);
  useEffect(() => {
    slugsRef.current = slugs;
  }, [slugs]);

  const setFavorite = useCallback(
    (slug: string, wanted: boolean) => {
      if (!userId) {
        setGuestSlugs((previous) => (wanted ? (previous.includes(slug) ? previous : [...previous, slug]) : previous.filter((item) => item !== slug)));
        return;
      }
      const apply = (list: string[], on: boolean) => (on ? (list.includes(slug) ? list : [...list, slug]) : list.filter((item) => item !== slug));
      setServer((previous) => ({ userId, slugs: apply(previous?.userId === userId ? previous.slugs : slugsRef.current, wanted) }));
      const request = wanted ? services.account.addFavorite(slug) : services.account.removeFavorite(slug);
      request.then(
        () => setSyncError(null),
        (error: unknown) => {
          // Sunucu reddetti: iyimser değişikliği geri al.
          setServer((previous) => (previous?.userId === userId ? { userId, slugs: apply(previous.slugs, !wanted) } : previous));
          setSyncError(friendlyError(error));
        },
      );
    },
    [userId, services],
  );

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);
  const toggleFavorite = useCallback((slug: string) => setFavorite(slug, !slugsRef.current.includes(slug)), [setFavorite]);
  const removeFavorite = useCallback((slug: string) => setFavorite(slug, false), [setFavorite]);

  const count = slugs.length;
  const loaded = userId ? server?.userId === userId || syncError !== null : hydrated;

  const value = useMemo(
    () => ({ slugs, count, isFavorite, toggleFavorite, removeFavorite, syncError, loaded }),
    [slugs, count, isFavorite, toggleFavorite, removeFavorite, syncError, loaded]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites, FavoritesProvider içinde kullanılmalıdır.");
  return ctx;
}
