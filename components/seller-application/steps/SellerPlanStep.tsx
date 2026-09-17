"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { sellerPlans } from "@/lib/seller-application";
import { cn } from "@/lib/utils";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerPlanStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  return (
    <StepShell
      title="Mağaza Paketi"
      subtitle="VitrinPlus'ta satış komisyonu %0'dır — sadece seçtiğiniz pakete göre sabit bir aylık mağaza ücreti ödersiniz."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sellerPlans.map((plan) => {
          const isActive = data.planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setData((prev) => ({ ...prev, planId: plan.id }))}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all",
                isActive
                  ? "border-brand-500 bg-brand-50/60 shadow-glow"
                  : "border-navy-100 bg-white hover:border-brand-200"
              )}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                  En Popüler
                </span>
              ) : null}
              <p className="text-sm font-bold text-navy-900">{plan.name}</p>
              <p className="mt-0.5 text-xs text-navy-400">{plan.tagline}</p>
              <p className="mt-3 text-sm font-semibold text-brand-600">{plan.priceLabel}</p>

              <ul className="mt-3.5 flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 text-xs text-navy-600">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {errors.planId ? <p className="text-xs font-medium text-rose-600">{errors.planId}</p> : null}

      <p className="rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs leading-relaxed text-navy-500">
        Paket ücretleri henüz kesinleşmedi ve lansmanla birlikte duyurulacak.
        Şimdi bir paket seçmeniz, başvurunuzun türünü belirlememize yardımcı olur;
        onay sonrası paketinizi mağaza panelinizden değiştirebilirsiniz.
      </p>
    </StepShell>
  );
}
