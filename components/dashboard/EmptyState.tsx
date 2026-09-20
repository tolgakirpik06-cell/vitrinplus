import type { LucideIcon } from "lucide-react";
import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <span aria-hidden className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-royal-50 text-royal-600">
        <Icon size={22} />
      </span>
      <p className="text-sm font-bold text-navy-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Yükleniyor…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2.5 px-6 py-14 text-sm text-muted", className)}>
      <Loader2 size={18} className="animate-spin text-royal-600" aria-hidden />
      {label}
    </div>
  );
}

/** Kart/tablo yüklenirken kullanılan iskelet satırı. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-navy-50", className)} />;
}
