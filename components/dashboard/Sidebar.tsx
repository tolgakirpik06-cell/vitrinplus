"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NavChild = { label: string; href: string; exact?: boolean };

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sayaç rozeti (0 veya undefined ise gösterilmez). */
  badge?: number;
  badgeTone?: "danger" | "info";
  /** Yalnızca tam eşleşmede aktif (ör. kök "Genel Bakış"). */
  exact?: boolean;
  children?: NavChild[];
};

export type SidebarAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
};

export function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** VitrinPlus "V" işareti (yalnızca CSS + SVG; harici görsel yok). */
export function PanelLogo({ collapsed = false, subtitle }: { collapsed?: boolean; subtitle: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-royal-400 via-royal-600 to-brand-500 shadow-royal">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 6 12 19 19.5 6" />
        </svg>
      </span>
      {collapsed ? (
        <span className="sr-only">VitrinPlus {subtitle}</span>
      ) : (
        <span className="min-w-0 leading-none">
          <span className="block text-[19px] font-extrabold tracking-tight text-white">
            Vitrin<span className="text-royal-300">Plus</span>
          </span>
          <span className="mt-1 block text-[11px] font-medium text-navy-200">{subtitle}</span>
        </span>
      )}
    </div>
  );
}

const badgeTones = { danger: "bg-rose-500 text-white", info: "bg-royal-500/90 text-white" } as const;

function NavLink({ item, pathname, collapsed, onNavigate }: { item: NavItem; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const active = isNavActive(pathname, item.href, item.exact);
  const Icon = item.icon;
  const badge = item.badge && item.badge > 0 ? item.badge : null;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active && !item.children ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-royal-300",
          collapsed && "justify-center px-0",
          active ? "bg-gradient-to-r from-royal-600 to-royal-500 text-white shadow-royal" : "text-navy-100 hover:bg-white/[0.07] hover:text-white"
        )}
      >
        <Icon size={18} aria-hidden className={cn("shrink-0", active ? "text-white" : "text-navy-200 group-hover:text-white")} />
        {collapsed ? <span className="sr-only">{item.label}</span> : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {badge ? (
          <span
            className={cn(
              "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
              badgeTones[item.badgeTone ?? "danger"],
              collapsed && "absolute right-1.5 top-1"
            )}
          >
            <span aria-hidden>{badge > 99 ? "99+" : badge}</span>
            <span className="sr-only">{badge} bekleyen</span>
          </span>
        ) : null}
      </Link>
      {!collapsed && item.children && active ? (
        <ul className="mb-1 ml-[22px] mt-1 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map((child) => {
            const childActive = isNavActive(pathname, child.href, child.exact);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-royal-300",
                    childActive ? "bg-white/10 font-semibold text-white" : "text-navy-200 hover:text-white"
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function ActionRow({ action, collapsed, onNavigate }: { action: SidebarAction; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = action.icon;
  const className = cn(
    "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-navy-200 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-royal-300",
    collapsed && "justify-center px-0"
  );
  const content = (
    <>
      <Icon size={16} aria-hidden className="shrink-0" />
      {collapsed ? <span className="sr-only">{action.label}</span> : <span className="truncate">{action.label}</span>}
    </>
  );
  if (action.href) {
    return (
      <Link href={action.href} onClick={onNavigate} title={collapsed ? action.label : undefined} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={collapsed ? action.label : undefined}
      onClick={() => {
        onNavigate?.();
        action.onClick?.();
      }}
      className={className}
    >
      {content}
    </button>
  );
}

/**
 * Koyu lacivert gezinme çubuğu. Masaüstünde sabit, mobilde çekmece içinde kullanılır.
 * `collapsed` yalnızca simge gösterir (daraltma mimarisi hazır).
 */
export function Sidebar({
  items,
  pathname,
  collapsed = false,
  subtitle,
  onNavigate,
  onToggleCollapsed,
  promo,
  actions = [],
  navLabel = "Panel menüsü",
  homeHref = "/satici-panel",
}: {
  items: NavItem[];
  pathname: string;
  collapsed?: boolean;
  subtitle: string;
  onNavigate?: () => void;
  /** Verilirse daraltma düğmesi gösterilir (yalnızca masaüstü). */
  onToggleCollapsed?: () => void;
  /** Alt kısımdaki kart (Vitrin AI). Daraltılmış modda gösterilmez. */
  promo?: ReactNode;
  actions?: SidebarAction[];
  navLabel?: string;
  homeHref?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-white">
      <div className={cn("flex h-[60px] shrink-0 items-center border-b border-white/[0.07]", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href={homeHref} onClick={onNavigate} aria-label={`VitrinPlus ${subtitle} ana sayfası`} className="rounded-lg focus-visible:outline-2 focus-visible:outline-royal-300">
          <PanelLogo collapsed={collapsed} subtitle={subtitle} />
        </Link>
      </div>

      <nav aria-label={navLabel} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <ul className="space-y-1">
          {items.map((item) => (
            <NavLink key={item.key} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/[0.07] px-3 py-3">
        {!collapsed ? promo : null}
        {actions.map((action) => (
          <ActionRow key={action.key} action={action} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            aria-pressed={collapsed}
            className={cn(
              "hidden h-9 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-medium text-navy-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-royal-300 lg:flex",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
            {collapsed ? null : <span>Menüyü Daralt</span>}
          </button>
        ) : null}
      </div>
    </div>
  );
}
