"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem<K extends string = string> = { key: K; label: ReactNode; count?: number; disabled?: boolean };

/**
 * Erişilebilir sekme çubuğu (role=tablist, ok tuşlarıyla gezinme).
 * - "pill": ürün/stok filtre sekmeleri (referans 19, 24)
 * - "underline": çekmece içi sekmeler (referans 13, 24)
 * - "segment": grafik dönem seçici (Bugün / 7 Gün / 30 Gün)
 * İçerik render'ı çağıran tarafındadır; panel bağlantısı için `panelId` kullanılır.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  variant = "pill",
  label,
  className,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: "pill" | "underline" | "segment";
  label: string;
  className?: string;
}) {
  const baseId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.key === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = enabled[next];
    onChange(target.key);
    refs.current[target.key]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center",
        variant === "pill" && "no-scrollbar flex-wrap gap-2",
        variant === "underline" && "no-scrollbar gap-0 overflow-x-auto border-b border-line",
        variant === "segment" && "rounded-lg border border-line bg-white p-0.5",
        className
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            ref={(node) => {
              refs.current[item.key] = node;
            }}
            id={`${baseId}-${item.key}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              "whitespace-nowrap font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:opacity-40",
              variant === "pill" &&
                cn(
                  "rounded-lg border px-3.5 py-2 text-xs",
                  active ? "border-royal-200 bg-royal-50 text-royal-700" : "border-transparent text-muted hover:bg-navy-50 hover:text-navy-700"
                ),
              variant === "underline" &&
                cn(
                  "-mb-px flex-1 border-b-2 px-3 py-2.5 text-center text-xs",
                  active ? "border-royal-600 text-royal-700" : "border-transparent text-muted hover:text-navy-700"
                ),
              variant === "segment" &&
                cn("rounded-md px-3 py-1.5 text-xs", active ? "bg-royal-50 text-royal-700 shadow-[inset_0_0_0_1px_var(--color-royal-200)]" : "text-muted hover:text-navy-700")
            )}
          >
            {item.label}
            {item.count !== undefined ? <span className="ml-1 tabular-nums">({item.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}
