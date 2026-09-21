"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "@/lib/domain/errors";

type Settled<T> = { source: unknown; nonce: number; key: unknown; data: T | null; error: string | null };

export type AsyncResource<T> = {
  /** Son başarılı veri (yeniden yüklenirken eski veri gösterilmeye devam eder). */
  data: T | null;
  /** İlk yükleme ya da yeniden yükleme sürüyor mu? */
  loading: boolean;
  /** Son denemenin kullanıcıya gösterilebilir hatası. */
  error: string | null;
  /** Aynı isteği yeniden dener / veriyi tazeler. */
  reload: () => void;
};

/**
 * Yükleme / boş / hata / yeniden dene durumlarını tek yerde toplar.
 * `load` çağıran tarafından `useCallback` ile sabitlenmelidir (kimliği değişince istek yenilenir).
 * `load === null` ise (ör. oturum hazır değil) hiçbir şey yüklenmez ve `loading` true kalır.
 * `refreshKey` değiştiğinde (ör. arka plan senkronizasyonu bitti) `load` aynı kalsa da veri yeniden yüklenir.
 */
export function useAsync<T>(load: (() => Promise<T>) | null, refreshKey: unknown = 0): AsyncResource<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setSettled({ source: load, nonce, key: refreshKey, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setSettled((previous) => ({ source: load, nonce, key: refreshKey, data: previous?.data ?? null, error: friendlyError(error) }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, nonce, refreshKey]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const fresh = settled !== null && load !== null && settled.source === load && settled.nonce === nonce && settled.key === refreshKey;
  return { data: settled?.data ?? null, loading: !fresh, error: fresh ? settled.error : null, reload };
}
