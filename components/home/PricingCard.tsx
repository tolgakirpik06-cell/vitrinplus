import { Check } from "lucide-react";
import type { PricingPlan } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-4 transition-shadow",
        plan.featured
          ? "border-brand-400 bg-white shadow-glow"
          : "border-navy-100 bg-white shadow-card"
      )}
    >
      {plan.featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
          En Popüler
        </span>
      ) : null}

      <p className="text-sm font-bold text-navy-900">{plan.name}</p>
      <p className="mt-1.5">
        <span className="text-2xl font-extrabold text-navy-900">{plan.price}</span>
        <span className="ml-1 text-xs font-medium text-navy-400">TL / Ay</span>
      </p>

      <ul className="mt-3.5 flex flex-1 flex-col gap-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-1.5 text-xs text-navy-600">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        href="/satici-basvuru"
        variant={plan.featured ? "primary" : "outline"}
        size="sm"
        className="mt-4 w-full"
      >
        Başla
      </Button>
    </div>
  );
}
