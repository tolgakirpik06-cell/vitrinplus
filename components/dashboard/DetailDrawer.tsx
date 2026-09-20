"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/dashboard/useDialog";

/** Çekmece açıkken içeriğin sağdan bırakması gereken boşluk (geniş ekranlarda çekmece sabit panel gibi durur). */
export const drawerOffsetClass = (open: boolean) => cn("transition-[margin] duration-200", open && "xl:mr-[408px]");

/**
 * Sağ detay çekmecesi. ≥xl: sayfayı örtmeyen sabit panel (referans 13, 24);
 * daha dar ekranlarda karartmalı modal çekmece. Esc ile kapanır.
 */
export function DetailDrawer({
  open,
  onClose,
  label,
  header,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  /** Ekran okuyucular için çekmece adı. */
  label: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialog(open, ref, onClose, { trap: false });
  if (!open) return null;
  return (
    <>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-40 animate-fade-in bg-sidebar/40 xl:hidden" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] xl:top-[60px] animate-drawer-in flex-col border-l border-line bg-white shadow-drawer outline-none"
      >
        <h2 id={titleId} className="sr-only">
          {label}
        </h2>
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            aria-label="Çekmeceyi kapat"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-royal-500"
          >
            <X size={17} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white px-5 py-3.5">{footer}</div> : null}
      </aside>
    </>
  );
}
