"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Render sırasında Date.now() çağırmadan "şimdi" bilgisini veren hook.
 * Değer 30 sn'de bir güncellenir; sunucuda 0 döner (yalnızca istemcide
 * render edilen paneller için tasarlandı).
 */
let nowValue = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  nowValue = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    nowValue = Date.now();
    timer = setInterval(tick, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  if (nowValue === 0) nowValue = Date.now();
  return nowValue;
}

export function useNow(): Date {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return useMemo(() => new Date(value), [value]);
}
