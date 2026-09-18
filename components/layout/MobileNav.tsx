"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Menu,
  X,
  Heart,
  ShoppingCart,
  LogIn,
  Store,
  LayoutGrid,
} from "lucide-react";
import { navCategories } from "@/data/categories";
import { useCart } from "@/components/cart/CartProvider";
import { AiSearchBar } from "./AiSearchBar";

export function MobileNav({ searchQuery = "" }: { searchQuery?: string }) {
  const [open, setOpen] = useState(false);
  // Header'ın kendisi `backdrop-blur` kullanıyor; bu, CSS'te fixed-position
  // elemanlar için yeni bir "containing block" oluşturur ve menü Header'ın
  // içine hapsolup kesilir/taşar (madde 16). Çözüm: menüyü bir portal ile
  // doğrudan document.body'ye render ederek Header'ın stacking/containing
  // context'inden tamamen çıkarmak. Portal'ı yalnızca client'ta mount
  // olduktan sonra kullanıyoruz ki sunucu/istemci hydration uyuşmazlığı olmasın.
  const [mounted, setMounted] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  const overlay = open ? (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-extrabold text-navy-900">
            Vitrin<span className="text-brand-500">Plus</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy-500 hover:bg-navy-50"
            aria-label="Menüyü kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-5">
          <AiSearchBar key={searchQuery} compact defaultValue={searchQuery} onNavigate={() => setOpen(false)} />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <Link
            href="/favoriler"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-navy-100 px-3 py-2.5 text-sm font-medium text-navy-700"
          >
            <Heart size={18} /> Favoriler
          </Link>
          <Link
            href="/sepet"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-navy-100 px-3 py-2.5 text-sm font-medium text-navy-700"
          >
            <ShoppingCart size={18} /> Sepet
            {count > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        </div>

        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
          <LayoutGrid size={14} /> Tüm Kategoriler
        </p>
        <nav className="mb-5 flex max-h-64 flex-col divide-y divide-navy-50 overflow-y-auto rounded-xl border border-navy-50">
          {navCategories.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-navy-700 hover:bg-navy-50"
            >
              <category.icon size={17} className="text-navy-400" />
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Link
            href="/giris"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-700"
          >
            <LogIn size={16} /> Giriş Yap
          </Link>
          <Link
            href="/satici-basvuru"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Store size={16} /> Mağaza Aç
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-100 text-navy-700 lg:hidden"
        aria-label="Menüyü aç"
      >
        <Menu size={20} />
      </button>

      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
