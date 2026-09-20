"use client";

import { useId, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grafik ekseni için "güzel" üst sınır: 48.750 -> 50.000. */
export function niceMax(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

export type ChartPoint = { label: string; value: number };

/**
 * Bağımlılıksız alan/çizgi grafiği. Eksen etiketleri HTML olduğu için her
 * genişlikte keskin kalır; çizgi SVG'de `non-scaling-stroke` ile çizilir.
 */
export function AreaChart({
  points,
  height = 220,
  format,
  yTicks = 4,
  color = "#5560f2",
  xLabelEvery,
  ariaLabel,
  className,
}: {
  points: ChartPoint[];
  height?: number;
  format: (value: number) => string;
  yTicks?: number;
  color?: string;
  /** X etiketlerinden kaçta biri gösterilsin (varsayılan: otomatik). */
  xLabelEvery?: number;
  ariaLabel: string;
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const count = points.length;
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const step = xLabelEvery ?? Math.max(1, Math.ceil(count / 7));
  const xOf = (index: number) => (count <= 1 ? 50 : (index / (count - 1)) * 100);
  const yOf = (value: number) => 100 - (value / max) * 100;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(2)},${yOf(point.value).toFixed(2)}`).join(" ");
  const area = count ? `${line} L${xOf(count - 1).toFixed(2)},100 L${xOf(0).toFixed(2)},100 Z` : "";
  const ticks = Array.from({ length: yTicks + 1 }, (_, index) => (max / yTicks) * (yTicks - index));

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(fraction * (count - 1)));
  }

  const active = hover !== null ? points[hover] : null;
  return (
    <div className={cn("flex gap-2", className)} role="img" aria-label={ariaLabel}>
      <div aria-hidden className="flex shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted" style={{ height }}>
        {ticks.map((tick) => (
          <span key={tick} className="leading-none">
            {format(tick)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: height - 24 }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <div key={tick} className="border-t border-dashed border-line" />
            ))}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
            {line ? <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {active && hover !== null ? (
            <>
              <span aria-hidden className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${xOf(hover)}%`, top: `${yOf(active.value)}%`, backgroundColor: color }} />
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
                style={{ left: `${Math.min(88, Math.max(12, xOf(hover)))}%`, top: `${Math.max(0, yOf(active.value) - 22)}%` }}
              >
                <span className="block text-[10px] font-medium text-navy-200">{active.label}</span>
                {format(active.value)}
              </div>
            </>
          ) : null}
        </div>
        <div aria-hidden className="relative mt-1.5 flex h-4 justify-between text-[11px] text-muted">
          {points.map((point, index) =>
            index % step === 0 || index === count - 1 ? (
              <span key={`${point.label}-${index}`} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${xOf(index)}%` }}>
                {point.label}
              </span>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

/** Çift serili (ör. ciro + sipariş) sütun grafiği. */
export function BarChart({
  points,
  height = 200,
  format,
  color = "#5560f2",
  ariaLabel,
  className,
}: {
  points: ChartPoint[];
  height?: number;
  format: (value: number) => string;
  color?: string;
  ariaLabel: string;
  className?: string;
}) {
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const step = Math.max(1, Math.ceil(points.length / 8));
  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }} role="img" aria-label={ariaLabel}>
      {points.map((point, index) => (
        <div key={`${point.label}-${index}`} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="w-full rounded-t-md transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(2, (point.value / max) * 82)}%`, backgroundColor: color }} title={`${point.label}: ${format(point.value)}`} />
          <span aria-hidden className="mt-1 h-4 truncate text-center text-[10px] text-muted">
            {index % step === 0 ? point.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export type DonutSegment = { label: string; value: number; color: string };

/** Halka grafik. `children` ortadaki metin alanıdır. */
export function DonutChart({
  segments,
  size = 168,
  thickness = 18,
  children,
  ariaLabel,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = segments.reduce<{ segment: DonutSegment; length: number; offset: number }[]>((accumulated, segment) => {
    const previous = accumulated[accumulated.length - 1];
    const length = total > 0 ? (Math.max(0, segment.value) / total) * circumference : 0;
    accumulated.push({ segment, length, offset: previous ? previous.offset + previous.length : 0 });
    return accumulated;
  }, []);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f8" strokeWidth={thickness} />
        {total > 0
          ? arcs.map(({ segment, length, offset }) => (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            ))
          : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Puan halkası (0–100). */
export function ProgressRing({
  value,
  size = 112,
  thickness = 9,
  color = "#10b981",
  children,
  ariaLabel,
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  children?: ReactNode;
  ariaLabel: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, value / 100));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8f5ee" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${ratio * circumference} ${circumference}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Yatay ilerleme çubuğu. */
export function ProgressBar({ value, tone = "success", className, label }: { value: number; tone?: "success" | "warning" | "danger" | "brand"; className?: string; label: string }) {
  const colors = { success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-rose-500", brand: "bg-royal-500" } as const;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-navy-50", className)}>
      <div className={cn("h-full rounded-full transition-[width]", colors[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
