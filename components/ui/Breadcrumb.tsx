import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/types";

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-navy-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight size={12} className="shrink-0 text-navy-300" aria-hidden /> : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="shrink-0 transition-colors hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "shrink-0 font-medium text-navy-600" : "shrink-0"}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
