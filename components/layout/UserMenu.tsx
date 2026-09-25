"use client";

import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, LogIn, LogOut, MapPin, Package, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMarketplace } from "@/components/marketplace/context";
import { ACCOUNT_MENU_LINKS, resolveHeaderAccount, type AccountMenuKey } from "@/lib/header-account";
import { cn } from "@/lib/utils";

const ICONS: Record<AccountMenuKey, LucideIcon> = {
  account: UserRound,
  orders: Package,
  favorites: Heart,
  addresses: MapPin,
};

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-brand-600 focus-visible:bg-navy-50 focus-visible:outline-2 focus-visible:outline-brand-500";
const logoutClass = cn(itemClass, "text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:bg-rose-50 disabled:opacity-60");

/**
 * Header'daki hesap alanının ortak durumu (demo ve Supabase modunda aynı): oturum durumu + çıkış işlemi.
 * Oturum açık kullanıcıya "Giriş Yap" gösterilmez; oturum durumu henüz bilinmiyorsa hiçbir düğme gösterilmez.
 */
function useHeaderAccount() {
  const { ready, signedIn, user, logout } = useMarketplace();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const account = resolveHeaderAccount({ ready, signedIn, user });

  /** Çıkış başarılıysa true. Başarısızsa (ör. kaydedilmemiş değişiklik) hata gösterilir ve menü açık kalır. */
  const signOut = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      await logout();
      router.push("/");
      router.refresh();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Çıkış yapılamadı.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [logout, router]);

  return { account, busy, error, signOut };
}

function AccountAvatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600", className)}>
      <UserRound size={16} />
    </span>
  );
}

/** Masaüstü header: giriş yoksa "Giriş Yap"; giriş varsa kullanıcı ikonu + ad-soyad + açılır menü. */
export function UserMenu() {
  const { account, busy, error, signOut } = useHeaderAccount();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const menuOpen = open && account.status === "member";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  if (account.status === "loading") {
    // Oturum durumu belli olana kadar yer tutucu: oturum açık kullanıcıya "Giriş Yap" bir an bile gösterilmez.
    return <span aria-hidden className="inline-block h-9 w-[132px] animate-pulse rounded-full bg-navy-50" />;
  }

  if (account.status === "guest") {
    return (
      <Button href="/giris" variant="outline" size="sm" className="whitespace-nowrap">
        <LogIn size={15} />
        Giriş Yap
      </Button>
    );
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    // Odak menünün dışındaki bir öğeye geçtiyse (Tab) menüyü kapat.
    const target = event.relatedTarget as Node | null;
    if (target && !event.currentTarget.contains(target)) setOpen(false);
  }

  async function handleSignOut() {
    if (await signOut()) setOpen(false);
  }

  return (
    <div ref={wrapper} className="relative" onBlur={onBlur}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !menuOpen) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        aria-label={`Hesap menüsü, ${account.name}`}
        className="flex h-9 max-w-[200px] items-center gap-2 rounded-full border border-navy-100 bg-white py-0 pl-1 pr-3 text-sm font-semibold text-navy-700 transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <AccountAvatar className="h-7 w-7" />
        <span className="truncate">{account.name}</span>
        <ChevronDown size={15} aria-hidden className={cn("shrink-0 text-navy-300 transition-transform", menuOpen && "rotate-180")} />
      </button>

      {menuOpen ? (
        <div ref={panel} className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 animate-fade-in rounded-2xl border border-navy-100 bg-white p-1.5 shadow-premium">
          <div id={menuId} role="menu" aria-label="Hesap menüsü" onKeyDown={onMenuKeyDown}>
            {ACCOUNT_MENU_LINKS.map((link) => {
              const Icon = ICONS[link.key];
              return (
                <Link key={link.key} href={link.href} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                  <Icon size={16} aria-hidden className="text-navy-400" />
                  {link.label}
                </Link>
              );
            })}
            <div className="my-1 border-t border-navy-50" role="separator" />
            <button type="button" role="menuitem" disabled={busy} onClick={handleSignOut} className={logoutClass}>
              <LogOut size={16} aria-hidden />
              {busy ? "Çıkış yapılıyor…" : "Çıkış Yap"}
            </button>
          </div>
          {error ? (
            <p role="alert" className="px-3 pb-1.5 pt-1 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Mobil menü (çekmece): giriş yoksa "Giriş Yap"; giriş varsa kullanıcı kartı + hesap bağlantıları + Çıkış Yap. */
export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { account, busy, error, signOut } = useHeaderAccount();

  if (account.status === "loading") {
    return <span aria-hidden className="block h-11 animate-pulse rounded-full bg-navy-50" />;
  }

  if (account.status === "guest") {
    return (
      <Link
        href="/giris"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-full border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-700"
      >
        <LogIn size={16} /> Giriş Yap
      </Link>
    );
  }

  async function handleSignOut() {
    if (await signOut()) onNavigate();
  }

  return (
    <section aria-label="Hesabım" className="rounded-2xl border border-navy-100 p-1.5">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <AccountAvatar className="h-9 w-9" />
        <span className="min-w-0 truncate text-sm font-bold text-navy-900">{account.name}</span>
      </div>
      <nav aria-label="Hesap bağlantıları" className="flex flex-col border-t border-navy-50 pt-1">
        {ACCOUNT_MENU_LINKS.map((link) => {
          const Icon = ICONS[link.key];
          return (
            <Link key={link.key} href={link.href} onClick={onNavigate} className={itemClass}>
              <Icon size={16} aria-hidden className="text-navy-400" />
              {link.label}
            </Link>
          );
        })}
        <button type="button" disabled={busy} onClick={handleSignOut} className={logoutClass}>
          <LogOut size={16} aria-hidden />
          {busy ? "Çıkış yapılıyor…" : "Çıkış Yap"}
        </button>
      </nav>
      {error ? (
        <p role="alert" className="px-3 pb-1.5 pt-1 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
