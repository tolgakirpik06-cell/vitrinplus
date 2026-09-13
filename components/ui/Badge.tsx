import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AiTagType } from "@/types";

const toneClasses: Record<AiTagType, string> = {
  price: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  delivery: "bg-brand-50 text-brand-700 ring-brand-600/20",
  rating: "bg-violet-50 text-violet-700 ring-violet-600/20",
  smart: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function AiTagBadge({ type, label }: { type: AiTagType; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        toneClasses[type]
      )}
    >
      {label}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-600",
        className
      )}
    >
      {children}
    </span>
  );
}
