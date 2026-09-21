"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/domain/errors";
import { useMarketplace } from "./context";

type Result = { key: string; attempt: number; error: string | null };

/**
 * Gerçek modda verilen ürünlerin sunucudaki güncel halini getirir (sepet, ödeme, favoriler).
 * `force` doğruysa önbellek yerine her seferinde sunucudan okur (ödeme adımında güncel fiyat / stok için).
 * `loading` sunucu yanıtı gelene kadar doğrudur; böylece ekran "ürün satışta değil" diye yanlış uyarı göstermez.
 * `error` getirme başarısız olduysa (ör. bağlantı) doludur: bu durumda ürünün "satışta olmadığı" SÖYLENMEMELİ, `retry` sunulmalıdır.
 * Demo modunda hiçbir şey yapmaz; `loading` her zaman false'tur.
 */
export function useEnsureProducts(slugs: readonly string[], options: { force?: boolean } = {}): { loading: boolean; error: string | null; retry: () => void } {
  const { ensureProducts, mode, ready } = useMarketplace();
  const key = slugs.join("\n");
  const force = options.force === true;
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (mode !== "supabase" || !ready || key === "") return;
    let cancelled = false;
    ensureProducts(key.split("\n"), { force }).then(
      () => {
        if (!cancelled) setResult({ key, attempt, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, attempt, error: friendlyError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode, ready, key, force, attempt, ensureProducts]);

  const settled = result !== null && result.key === key && result.attempt === attempt;
  return {
    loading: mode === "supabase" && key !== "" && (!ready || !settled),
    error: settled ? result.error : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
