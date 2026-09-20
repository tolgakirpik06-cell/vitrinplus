"use client";

import { AlertTriangle, X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/dashboard/form";
import { useDialog } from "@/components/dashboard/useDialog";

/** Ortalanmış modal diyalog (odak tuzağı, Esc, kaydırma kilidi). */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, ref, onClose, { trap: true, lockScroll: true });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 animate-fade-in bg-sidebar/50 backdrop-blur-[2px]" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-fade-in flex-col rounded-t-2xl bg-white shadow-premium outline-none sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-navy-900">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-royal-500"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        {children ? <div className="overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-navy-50/40 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Geri alınamaz veya önemli işlemler için onay diyaloğu. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "danger",
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </ActionButton>
          <ActionButton variant={tone === "danger" ? "dangerSolid" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      <div className="flex gap-3">
        <span aria-hidden className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-royal-50 text-royal-600")}>
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0 text-[13px] leading-relaxed text-navy-600">
          {description}
          {children}
        </div>
      </div>
    </Modal>
  );
}
