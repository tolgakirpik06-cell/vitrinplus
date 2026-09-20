"use client";

import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import { Sidebar, type NavItem, type SidebarAction } from "@/components/dashboard/Sidebar";
import { ToastProvider } from "@/components/dashboard/Toast";
import { useDialog } from "@/components/dashboard/useDialog";

type SidebarPrefs = { collapsed: boolean };

const sidebarStore = createLocalStore<SidebarPrefs>({
  key: STORAGE_KEYS.sidebar,
  initial: { collapsed: false },
  parse: (raw) => ({ collapsed: typeof raw === "object" && raw !== null && (raw as SidebarPrefs).collapsed === true }),
});

export type ShellHeaderContext = {
  openMenu: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

/**
 * Panel iskeleti: sabit koyu lacivert kenar çubuğu (masaüstü), mobilde çekmece,
 * yapışkan üst çubuk ve açık renkli çalışma alanı. Satıcı ve (ileride) yönetici
 * panelleri aynı iskeleti farklı menü/başlık ile kullanır.
 */
export function DashboardShell({
  nav,
  subtitle,
  header,
  promo,
  actions,
  children,
}: {
  nav: NavItem[];
  subtitle: string;
  header: (context: ShellHeaderContext) => ReactNode;
  promo?: ReactNode;
  actions?: SidebarAction[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed } = useLocalStore(sidebarStore);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const toggleCollapsed = useCallback(() => {
    try {
      sidebarStore.update((previous) => ({ collapsed: !previous.collapsed }));
    } catch {
      // Tercih kaydedilemezse menü mevcut haliyle kalır.
    }
  }, []);

  useDialog(menuOpen, drawerRef, closeMenu, { lockScroll: true });

  return (
    <ToastProvider>
      <div className="min-h-screen bg-canvas text-navy-800">
        <a
          href="#panel-main"
          className="sr-only z-[90] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-royal-700 shadow-premium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          İçeriğe geç
        </a>

        <aside className={cn("fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block", collapsed ? "w-[76px]" : "w-[220px]")}>
          <Sidebar items={nav} pathname={pathname} collapsed={collapsed} subtitle={subtitle} promo={promo} actions={actions} onToggleCollapsed={toggleCollapsed} />
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div aria-hidden onClick={closeMenu} className="absolute inset-0 animate-fade-in bg-sidebar/60" />
            <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Panel menüsü" tabIndex={-1} className="absolute inset-y-0 left-0 w-[264px] max-w-[85vw] animate-drawer-in outline-none">
              <Sidebar items={nav} pathname={pathname} subtitle={subtitle} promo={promo} actions={actions} onNavigate={closeMenu} />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Menüyü kapat"
                className="absolute right-2 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-navy-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-royal-300"
              >
                <X size={17} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        <div className={cn("flex min-h-screen min-w-0 flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[220px]")}>
          {header({ openMenu, collapsed, toggleCollapsed })}
          <main id="panel-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-5 outline-none sm:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
