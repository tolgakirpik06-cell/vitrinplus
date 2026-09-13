"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Heart,
  ShoppingCart,
  LogIn,
  UserPlus,
  Store,
  LayoutGrid,
} from "lucide-react";
import { navCategories } from "@/data/categories";
import { AiSearchBar } from "./AiSearchBar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

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

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-extrabold text-navy-900">
                Pazar<span className="text-brand-500">Buy</span>
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
              <AiSearchBar compact />
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
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  3
                </span>
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
                href="/satici-basvuru"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-700"
              >
                <Store size={16} /> Satıcı Ol
              </Link>
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-700"
              >
                <LogIn size={16} /> Giriş Yap
              </Link>
              <Link
                href="/kayit"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <UserPlus size={16} /> Üye Ol
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
