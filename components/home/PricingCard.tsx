import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

/** Paket kartı. Fiyat ve özellikler `lib/plans.ts` tek kaynağından gelir. */
export function PricingCard({ plan, compact = false }: { plan: Plan; compact?: boolean }) {
  const features = compact ? plan.features.slice(0, 4) : plan.features;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-4 transition-shadow",
        plan.featured ? "border-brand-400 bg-white shadow-glow" : "border-navy-100 bg-white shadow-card"
      )}
    >
      {plan.featured && plan.badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">{plan.badge}</span>
      ) : null}

      <p className="text-sm font-bold text-navy-900">{plan.name}</p>
      <p className="mt-1.5">
        {plan.monthlyPrice === null ? (
          <span className="text-xl font-extrabold text-navy-900">Teklif Al</span>
        ) : (
          <>
            <span className="text-2xl font-extrabold text-navy-900">{plan.monthlyPrice.toLocaleString("tr-TR")}</span>
            <span className="ml-1 text-xs font-medium text-navy-400">TL / Ay</span>
          </>
        )}
      </p>
      {plan.yearlyPrice !== null && !compact ? <p className="mt-0.5 text-[11px] text-navy-400">Yıllık {plan.yearlyPrice.toLocaleString("tr-TR")} TL</p> : null}
      <p className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-center text-xs font-bold text-brand-700">{plan.productLimitLabel}</p>

      <ul className="mt-3.5 flex flex-1 flex-col gap-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-1.5 text-xs text-navy-600">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <Button href="/satici-basvuru" variant={plan.featured ? "primary" : "outline"} size="sm" className="mt-4 w-full">
        {plan.monthlyPrice === null ? "Teklif Al" : "Başla"}
      </Button>
    </div>
  );
}
