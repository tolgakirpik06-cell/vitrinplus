import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/dashboard/Panel";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

export type IconTone = "green" | "blue" | "violet" | "amber" | "teal" | "rose" | "slate";

const iconTones: Record<IconTone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  teal: "bg-teal-50 text-teal-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-navy-50 text-navy-400",
};

export function IconTile({ icon: Icon, tone = "violet", className }: { icon: LucideIcon; tone?: IconTone; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconTones[tone], className)}>
      <Icon size={19} />
    </span>
  );
}

/** Artış/azalış rozeti. `goodWhen`: azalışın iyi olduğu metriklerde (iade oranı) "down" verilir. */
export function DeltaBadge({ value, goodWhen = "up", className }: { value: number | null; goodWhen?: "up" | "down"; className?: string }) {
  if (value === null) return null;
  const up = value >= 0;
  const good = goodWhen === "up" ? up : !up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", good ? "text-emerald-600" : "text-rose-600", className)}>
      <Icon size={13} aria-hidden />
      <span className="sr-only">{up ? "Artış" : "Azalış"}</span>
      {formatPercent(Math.abs(value))}
    </span>
  );
}

/** KPI kartı: ikon, etiket, büyük değer, değişim rozeti ve alt not. */
export function StatCard({
  icon,
  tone = "violet",
  label,
  value,
  delta,
  goodWhen,
  note,
  badge,
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  label: string;
  value: ReactNode;
  delta?: number | null;
  goodWhen?: "up" | "down";
  note?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <Panel padded={false} className={cn("flex min-w-0 flex-col gap-2.5 p-4", className)}>
      <div className="flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} className="h-9 w-9" />
        <p className="min-w-0 truncate text-xs font-semibold text-muted">{label}</p>
        {badge ? <span className="ml-auto shrink-0">{badge}</span> : null}
      </div>
      <p className="text-[24px] font-extrabold leading-none tracking-tight text-navy-900 tabular-nums">{value}</p>
      <div className="flex min-h-[18px] flex-wrap items-center gap-x-2 text-xs text-muted">
        {delta !== undefined ? <DeltaBadge value={delta} goodWhen={goodWhen} /> : null}
        {note ? <span>{note}</span> : null}
      </div>
    </Panel>
  );
}

/** Kompakt metrik: küçük paneller içinde (reklam performansı, stok özeti vb.). */
export function MetricCard({
  label,
  value,
  delta,
  goodWhen,
  note,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  goodWhen?: "up" | "down";
  note?: ReactNode;
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
}) {
  const valueTone = tone === "danger" ? "text-rose-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-navy-900";
  return (
    <div className={cn("rounded-xl border border-line bg-white px-3 py-2.5", className)}>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={cn("mt-1 text-lg font-extrabold leading-none tabular-nums", valueTone)}>{value}</p>
      {delta !== undefined || note ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
          {delta !== undefined ? <DeltaBadge value={delta} goodWhen={goodWhen} className="text-[11px]" /> : null}
          {note ? <span>{note}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
