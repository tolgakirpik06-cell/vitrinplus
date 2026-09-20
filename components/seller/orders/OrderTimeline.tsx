import { cn } from "@/lib/utils";
import { formatCompactDateTime } from "@/lib/format";
import type { TimelineStep } from "@/lib/seller-analytics";

/** Yatay sipariş zaman çizelgesi (referans 13): tamamlanan adımlar yeşil, bekleyenler gri. */
export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="grid grid-cols-5" aria-label="Sipariş zaman çizelgesi">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex flex-col items-center text-center" aria-current={step.done && !steps[index + 1]?.done ? "step" : undefined}>
          {index > 0 ? <span aria-hidden className={cn("absolute -left-1/2 top-[7px] h-0.5 w-full", step.done ? "bg-emerald-400" : "bg-navy-100")} /> : null}
          <span aria-hidden className={cn("relative z-10 h-4 w-4 rounded-full border-2", step.done ? "border-emerald-500 bg-emerald-500" : "border-navy-200 bg-white")} />
          <span className={cn("mt-1.5 text-[10px] font-semibold leading-tight", step.done ? "text-emerald-700" : "text-muted")}>{step.label}</span>
          <span className="mt-0.5 text-[10px] leading-tight text-muted">{step.done && step.at ? formatCompactDateTime(step.at) : "—"}</span>
          <span className="sr-only">{step.done ? "Tamamlandı" : "Bekliyor"}</span>
        </li>
      ))}
    </ol>
  );
}
