"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMarketplace } from "@/components/marketplace/context";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/hesabim", label: "Genel", exact: true },
  { href: "/hesabim/profil", label: "Profil" },
  { href: "/hesabim/adresler", label: "Adreslerim" },
  { href: "/siparislerim", label: "Siparişlerim" },
  { href: "/hesabim/iadeler", label: "İadelerim" },
  { href: "/favoriler", label: "Favorilerim" },
  { href: "/hesabim/bildirimler", label: "Bildirimler" },
];

export const accountCard = "rounded-2xl border border-navy-100 bg-white p-5 sm:p-6";
export const accountButton = "inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40";
export const accountGhostButton = "inline-flex items-center justify-center rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 disabled:cursor-not-allowed disabled:opacity-40";
export const accountField = "mt-1 block w-full rounded-xl border border-navy-200 bg-white p-3 text-sm";

/** Hesabım bölümünün ortak çerçevesi: giriş kontrolü + gezinme. (Yetki kontrolü değildir; veri erişimi RLS ile korunur.) */
export function AccountShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { ready, user, mode } = useMarketplace();
  const pathname = usePathname() ?? "";

  if (!ready) return <p role="status">Hesabın yükleniyor…</p>;
  if (!user) {
    return (
      <div className={accountCard}>
        <h1 className="text-2xl font-bold">{mode === "supabase" ? "Hesabım" : "Demo hesabın"}</h1>
        <p className="my-4 text-sm text-navy-500">Devam etmek için giriş yapmalısın.</p>
        <Link className={accountButton} href={`/giris?next=${encodeURIComponent(pathname || "/hesabim")}`}>Giriş yap</Link>
        <Link className="ml-5 text-sm font-semibold text-brand-600" href="/kayit">Hesap oluştur</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Hesabım bölümleri" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? "bg-brand-500 text-white" : "border border-navy-100 bg-white text-navy-700 hover:border-navy-300"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <section className="min-w-0 space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-navy-500">{description}</p> : null}
        </header>
        {children}
      </section>
    </div>
  );
}
