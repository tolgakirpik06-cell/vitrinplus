"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useRef, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/components/dashboard/useDialog";

/**
 * Üst çubuk iskeleti (60px, sabit yapışkan). İçerik satıcıya/yöneticiye göre
 * çağıran tarafından doldurulur: `search` solda, `actions` sağda.
 */
export function DashboardHeader({
  onOpenMenu,
  onToggleCollapsed,
  collapsed,
  search,
  actions,
}: {
  onOpenMenu: () => void;
  onToggleCollapsed?: () => void;
  collapsed?: boolean;
  search?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menüyü aç"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-royal-500 lg:hidden"
      >
        <Menu size={20} aria-hidden />
      </button>
      {onToggleCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-royal-500 lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
      ) : null}
      <div className="min-w-0 flex-1">{search}</div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">{actions}</div>
    </header>
  );
}

/** Üst çubuk arama alanı (form; Enter ile gönderir). */
export function HeaderSearch({
  value,
  onChange,
  onSubmit,
  placeholder,
  label = "Panelde ara",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(value.trim());
  }
  return (
    <form role="search" onSubmit={submit} className="relative w-full max-w-[420px]">
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-xl border border-transparent bg-canvas pl-9 pr-9 text-[13px] text-navy-800 placeholder:text-navy-300 transition-colors focus-visible:border-royal-300 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-royal-200 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Aramayı temizle"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-navy-300 hover:bg-navy-50 hover:text-navy-600 focus-visible:outline-2 focus-visible:outline-royal-500"
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </form>
  );
}

/** Simge düğmesi (zorunlu aria-label) + isteğe bağlı sayaç rozeti. */
export function HeaderIconButton({
  label,
  onClick,
  badge,
  expanded,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  badge?: number;
  expanded?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={badge ? `${label} (${badge} yeni)` : label}
      aria-haspopup={expanded === undefined ? undefined : "dialog"}
      aria-expanded={expanded}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-royal-500",
        className
      )}
    >
      {children}
      {badge && badge > 0 ? (
        <span aria-hidden className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Üst çubuğa bağlı açılır panel (bildirimler, hesap menüsü). Dışına tıklayınca
 * veya Esc ile kapanır. Tetikleyiciyi ve paneli aynı sarmalayıcıda tutmak için
 * `trigger` ve `children` birlikte verilir.
 */
export function HeaderPopover({
  open,
  onClose,
  trigger,
  children,
  align = "right",
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, onClose);
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] animate-fade-in rounded-2xl border border-line bg-white p-4 shadow-premium",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
