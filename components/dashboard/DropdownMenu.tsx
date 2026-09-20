"use client";

import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

type Position = { top: number; left: number; minWidth: number };

/**
 * Açılır eylem menüsü. Menü, kaydırılabilir tabloların kırpmasından etkilenmemesi
 * için gövdeye (portal) sabit konumla çizilir. Ok tuşları, Esc ve dışarı tıklama desteklenir.
 */
export function DropdownMenu({
  label,
  trigger,
  triggerClassName,
  items,
  align = "right",
  disabled,
}: {
  /** Tetikleyici düğmenin erişilebilir adı. */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  items: MenuItem[];
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = position !== null;

  const close = useCallback(() => setPosition(null), []);

  function toggle() {
    if (open) return close();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 208;
    const left = align === "right" ? Math.max(8, rect.right - width) : Math.min(rect.left, window.innerWidth - width - 8);
    setPosition({ top: rect.bottom + 6, left, minWidth: Math.max(width, rect.width) });
  }

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]:not([disabled])');
    first?.focus({ preventScroll: true });
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not([disabled])') ?? []);
      if (!buttons.length) return;
      event.preventDefault();
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={toggle}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {position
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
              className="fixed z-[75] animate-fade-in rounded-xl border border-line bg-white p-1.5 shadow-premium"
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    {item.separatorBefore ? <div role="separator" className="my-1 h-px bg-line" /> : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        close();
                        item.onSelect();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:bg-navy-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                        item.danger ? "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50" : "text-navy-700 hover:bg-navy-50"
                      )}
                    >
                      {Icon ? <Icon size={15} aria-hidden className="shrink-0" /> : null}
                      {item.label}
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
