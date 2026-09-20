import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0">
        {breadcrumb?.length ? (
          <nav aria-label="Sayfa yolu" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
              {breadcrumb.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index === 0 ? <Home size={12} aria-hidden /> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="rounded hover:text-royal-600 focus-visible:outline-2 focus-visible:outline-royal-500">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{crumb.label}</span>
                  )}
                  {index < breadcrumb.length - 1 ? <ChevronRight size={12} aria-hidden /> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
