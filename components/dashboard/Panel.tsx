import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Panel yüzeyi: beyaz kart, ince kenarlık, yumuşak gölge. */
export function Panel({
  children,
  className,
  as: Tag = "section",
  padded = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  padded?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}) {
  return (
    <Tag className={cn("rounded-2xl border border-line bg-white shadow-panel", padded && "p-5", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
  className,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-bold leading-tight text-navy-900">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
