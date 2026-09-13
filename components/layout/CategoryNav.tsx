"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { mainCategories, categoryHref } from "@/data/categories";
import { MegaMenuPanel, ExtraCategoriesPanel } from "./MegaMenu";
import { cn } from "@/lib/utils";

const EXTRA_KEY = "diger-kategoriler";

export function CategoryNav() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  function openNow(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 140);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }
    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const activeMain = mainCategories.find((category) => category.slug === openKey);
  const isExtraOpen = openKey === EXTRA_KEY;

  return (
    <div ref={navRef} className="relative hidden border-t border-navy-100/70 bg-white lg:block" onMouseLeave={scheduleClose}>
      <nav aria-label="Kategoriler" className="section-container flex items-center gap-0.5">
        {mainCategories.map((category) => (
          <div key={category.id} onMouseEnter={() => openNow(category.slug)}>
            <Link
              href={categoryHref(category.slug)}
              className={cn(
                "flex items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold text-navy-700 transition-colors hover:bg-navy-50 hover:text-brand-600",
                openKey === category.slug && "bg-navy-50 text-brand-600"
              )}
            >
              {category.name}
            </Link>
          </div>
        ))}

        <div onMouseEnter={() => openNow(EXTRA_KEY)}>
          <button
            type="button"
            onClick={() => setOpenKey((current) => (current === EXTRA_KEY ? null : EXTRA_KEY))}
            className={cn(
              "flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold text-navy-500 transition-colors hover:bg-navy-50 hover:text-brand-600",
              isExtraOpen && "bg-navy-50 text-brand-600"
            )}
          >
            Diğer Kategoriler
            <ChevronDown size={13} className={cn("transition-transform duration-200", isExtraOpen && "rotate-180")} />
          </button>
        </div>
      </nav>

      {activeMain ? (
        <div className="absolute inset-x-0 top-full z-30" onMouseEnter={() => openNow(activeMain.slug)}>
          <div className="section-container">
            <MegaMenuPanel category={activeMain} />
          </div>
        </div>
      ) : null}

      {isExtraOpen ? (
        <div className="absolute inset-x-0 top-full z-30" onMouseEnter={() => openNow(EXTRA_KEY)}>
          <div className="section-container">
            <ExtraCategoriesPanel />
          </div>
        </div>
      ) : null}
    </div>
  );
}
