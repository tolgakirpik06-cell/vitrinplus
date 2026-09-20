"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, ExternalLink, LogOut, Settings, Store, Gem } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardHeader, HeaderIconButton, HeaderPopover, HeaderSearch } from "@/components/dashboard/DashboardHeader";
import type { ShellHeaderContext } from "@/components/dashboard/DashboardShell";
import { NotificationList } from "@/components/dashboard/NotificationPanel";
import { useToast } from "@/components/dashboard/Toast";
import { useDemo } from "@/components/demo/DemoProvider";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toLocaleUpperCase("tr-TR") || "VP"
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-royal-500 to-brand-500 text-[12px] font-bold text-white", className)}>
      {initials(name)}
    </span>
  );
}

const menuLink = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-royal-500";

export function SellerHeader({ shell }: { shell: ShellHeaderContext }) {
  const router = useRouter();
  const toast = useToast();
  const { logout } = useDemo();
  const { owner, shop, rows, products, plan, notifications, readIds, unreadCount, now, markNotificationsRead } = useSellerWorkspace();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function search(value: string) {
    if (!value) return;
    const needle = value.toLocaleLowerCase("tr-TR");
    const orderMatch = rows.some((row) => row.order.id.toLocaleLowerCase("tr-TR").includes(needle) || row.customer.name.toLocaleLowerCase("tr-TR").includes(needle));
    const productMatch = products.some((product) => product.name.toLocaleLowerCase("tr-TR").includes(needle) || product.sku.toLocaleLowerCase("tr-TR").includes(needle));
    const target = orderMatch && !productMatch ? sellerHref.orders : sellerHref.products;
    router.push(`${target}?q=${encodeURIComponent(value)}`);
  }

  function signOut() {
    setMenuOpen(false);
    try {
      logout();
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Çıkış yapılamadı.");
    }
  }

  return (
    <DashboardHeader
      onOpenMenu={shell.openMenu}
      onToggleCollapsed={shell.toggleCollapsed}
      collapsed={shell.collapsed}
      search={<HeaderSearch value={query} onChange={setQuery} onSubmit={search} placeholder="Ürün, sipariş veya müşteri ara…" label="Ürün, sipariş veya müşteri ara" />}
      actions={
        <>
          <HeaderPopover
            open={bellOpen}
            onClose={() => setBellOpen(false)}
            label="Bildirimler"
            trigger={
              <HeaderIconButton label="Bildirimler" badge={unreadCount} expanded={bellOpen} onClick={() => setBellOpen((open) => !open)}>
                <Bell size={19} aria-hidden />
              </HeaderIconButton>
            }
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold text-navy-900">Bildirimler</h2>
              <button
                type="button"
                disabled={unreadCount === 0}
                onClick={() => markNotificationsRead(notifications.map((item) => item.id))}
                className="text-[12px] font-semibold text-royal-600 hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-royal-500 disabled:text-navy-300"
              >
                Tümünü okundu işaretle
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <NotificationList
                items={notifications}
                now={now}
                readIds={readIds}
                limit={6}
                onSelect={(item) => {
                  markNotificationsRead([item.id]);
                  setBellOpen(false);
                }}
              />
            </div>
          </HeaderPopover>

          <Link
            href={sellerHref.plan}
            className="hidden items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-royal-500 md:flex"
            aria-label={`${shop.settings.storeName}, ${plan.name} paketi. Paketim sayfasına git`}
          >
            <Avatar name={shop.settings.storeName} className="h-8 w-8 rounded-lg" />
            <span className="max-w-[140px] leading-tight">
              <span className="block truncate text-[13px] font-bold text-navy-900">{shop.settings.storeName}</span>
              <span className="block truncate text-[11px] font-semibold text-royal-600">{plan.name} Paket</span>
            </span>
          </Link>

          <HeaderPopover
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            label="Hesap menüsü"
            className="w-[240px] p-2"
            trigger={
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                aria-label={`Hesap menüsü, ${owner.name}`}
                className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-royal-500"
              >
                <Avatar name={owner.name} />
                <span className="hidden max-w-[130px] text-left leading-tight lg:block">
                  <span className="block truncate text-[13px] font-bold text-navy-900">{owner.name}</span>
                  <span className="block truncate text-[11px] text-muted">Mağaza Yöneticisi</span>
                </span>
                <ChevronDown size={15} aria-hidden className="hidden text-navy-300 lg:block" />
              </button>
            }
          >
            <div className="border-b border-line px-3 pb-2 pt-1">
              <p className="truncate text-[13px] font-bold text-navy-900">{owner.name}</p>
              <p className="truncate text-[11.5px] text-muted">{owner.email}</p>
            </div>
            <nav aria-label="Hesap" className="pt-1.5">
              <Link href={sellerHref.store} onClick={() => setMenuOpen(false)} className={menuLink}>
                <Store size={15} aria-hidden /> Mağazam
              </Link>
              <Link href={sellerHref.plan} onClick={() => setMenuOpen(false)} className={menuLink}>
                <Gem size={15} aria-hidden /> Paketim
              </Link>
              <Link href={sellerHref.settings} onClick={() => setMenuOpen(false)} className={menuLink}>
                <Settings size={15} aria-hidden /> Ayarlar
              </Link>
              <Link href="/" onClick={() => setMenuOpen(false)} className={menuLink}>
                <ExternalLink size={15} aria-hidden /> VitrinPlus&apos;a Git
              </Link>
              <button type="button" onClick={signOut} className={cn(menuLink, "w-full text-rose-600 hover:bg-rose-50")}>
                <LogOut size={15} aria-hidden /> Çıkış Yap
              </button>
            </nav>
          </HeaderPopover>
        </>
      }
    />
  );
}
