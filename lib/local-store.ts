"use client";

import { useSyncExternalStore } from "react";

/**
 * Küçük, bağımlılıksız localStorage tabanlı store (useSyncExternalStore uyumlu).
 * - Sunucu render'ında `initial` döner, bu yüzden hydration uyuşmazlığı olmaz.
 * - Farklı sekmelerdeki değişiklikler `storage` olayıyla senkronlanır.
 * - Bozuk kayıt sessizce `initial`'a düşer; uygulama çalışmaya devam eder.
 */
export type LocalStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  /** Yazma başarısız olursa (kota vb.) hata fırlatır; çağıran yakalar ve kullanıcıya bildirir. */
  update: (updater: (previous: T) => T) => T;
};

export function createLocalStore<T>(options: { key: string; initial: T; parse: (raw: unknown) => T }): LocalStore<T> {
  const { key, initial, parse } = options;
  let cache: T = initial;
  let cachedRaw: string | null | undefined = undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (typeof window === "undefined") return initial;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cache;
    }
    if (raw === cachedRaw) return cache;
    cachedRaw = raw;
    if (raw === null) {
      cache = initial;
    } else {
      try {
        cache = parse(JSON.parse(raw));
      } catch {
        cache = initial;
      }
    }
    return cache;
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) notify();
  }

  return {
    subscribe(listener) {
      if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => initial,
    update(updater) {
      const next = updater(read());
      const serialized = JSON.stringify(next);
      window.localStorage.setItem(key, serialized);
      cachedRaw = serialized;
      cache = next;
      notify();
      return next;
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
