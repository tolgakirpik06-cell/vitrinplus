import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { navCategories } from "@/data/categories";

export function CategoryStrip() {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
      <Link
        href="/kategoriler"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-600"
      >
        <LayoutGrid size={15} />
        Tümü
      </Link>
      {navCategories.map((category) => (
        <Link
          key={category.id}
          href={category.href}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-navy-100 bg-white px-3.5 py-2 text-xs font-medium text-navy-600"
        >
          <category.icon size={15} className="text-navy-400" />
          {category.name}
        </Link>
      ))}
    </div>
  );
}
