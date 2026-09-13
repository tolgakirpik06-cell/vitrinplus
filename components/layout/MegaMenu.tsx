import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MainCategory, ExtraCategory } from "@/types";
import { categoryHref, extraCategories } from "@/data/categories";

export function MegaMenuPanel({ category }: { category: MainCategory }) {
  const href = categoryHref(category.slug);

  return (
    <div className="mb-3 overflow-hidden rounded-b-2xl border border-t-0 border-navy-100 bg-white shadow-2xl shadow-navy-950/10">
      <div className="grid grid-cols-[1.2fr_1.1fr_1fr] gap-8 p-6">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Alt Kategoriler</p>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {category.subcategories.map((sub) => (
              <li key={sub}>
                <Link
                  href={`${href}?alt=${encodeURIComponent(sub)}`}
                  className="block text-sm text-navy-600 transition-colors hover:text-brand-600"
                >
                  {sub}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Popüler Markalar</p>
          <ul className="flex flex-col gap-2.5">
            {category.brands.map((brand) => (
              <li key={brand}>
                <Link
                  href={`${href}?marka=${encodeURIComponent(brand)}`}
                  className="block text-sm text-navy-600 transition-colors hover:text-brand-600"
                >
                  {brand}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-4">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/25 blur-2xl"
            aria-hidden
          />
          <span className="relative inline-flex rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/20">
            {category.campaign.badge}
          </span>
          <p className="relative mt-2.5 text-sm font-bold leading-snug text-white">{category.campaign.title}</p>
          <p className="relative mt-1 text-xs leading-relaxed text-navy-300">{category.campaign.subtitle}</p>
          <Link
            href={href}
            className="relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 transition-colors hover:text-brand-300"
          >
            İncele
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <Link
        href={href}
        className="flex items-center justify-center gap-1.5 border-t border-navy-50 py-2.5 text-xs font-semibold text-navy-500 transition-colors hover:bg-navy-50 hover:text-brand-600"
      >
        Tüm {category.name} Ürünlerini Gör
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

export function ExtraCategoriesPanel() {
  return (
    <div className="mb-3 overflow-hidden rounded-b-2xl border border-t-0 border-navy-100 bg-white p-5 shadow-2xl shadow-navy-950/10">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Diğer Kategoriler</p>
      <div className="grid grid-cols-4 gap-2">
        {extraCategories.map((category: ExtraCategory) => (
          <Link
            key={category.id}
            href={categoryHref(category.slug)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-navy-600 transition-colors hover:bg-navy-50 hover:text-brand-600"
          >
            <category.icon size={17} className="shrink-0 text-navy-400" />
            <span className="truncate">{category.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
