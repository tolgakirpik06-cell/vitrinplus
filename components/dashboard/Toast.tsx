"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const icons = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const tones: Record<ToastTone, string> = {
  success: "border-emerald-200 text-emerald-800 [&_svg]:text-emerald-600",
  error: "border-rose-200 text-rose-800 [&_svg]:text-rose-600",
  info: "border-royal-200 text-navy-800 [&_svg]:text-royal-600",
};

/** Kullanıcı eylemlerine anlık geri bildirim (başarı / hata / bilgi). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setItems((previous) => previous.filter((item) => item.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((previous) => [...previous.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => push("success", message), error: (message) => push("error", message), info: (message) => push("info", message) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5">
        {items.map((item) => {
          const Icon = icons[item.tone];
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              className={cn("pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-[13px] font-medium shadow-premium", tones[item.tone])}
            >
              <Icon size={17} aria-hidden className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
              <button type="button" aria-label="Bildirimi kapat" onClick={() => dismiss(item.id)} className="shrink-0 rounded text-navy-300 hover:text-navy-600">
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast, ToastProvider içinde kullanılmalıdır.");
  return value;
}
