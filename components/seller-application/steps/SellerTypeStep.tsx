"use client";

import type { Dispatch, SetStateAction } from "react";
import { Building2, Landmark } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { cn } from "@/lib/utils";
import type { SellerApplicationData, SellerType } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

const options: {
  type: SellerType;
  icon: typeof Building2;
  title: string;
  description: string;
}[] = [
  {
    type: "sahis",
    icon: Building2,
    title: "Şahıs İşletmesi",
    description: "Vergi mükellefi bir şahıs işletmesi/esnaf olarak satış yapanlar için.",
  },
  {
    type: "limited-as",
    icon: Landmark,
    title: "Limited / Anonim Şirket",
    description: "Kurumsal şirket unvanı ile satış yapan işletmeler için.",
  },
];

export function SellerTypeStep({
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
      title="Nasıl satış yapmak istersiniz?"
      subtitle="VitrinPlus'ta yalnızca vergi mükellefi/kurumsal satıcılar mağaza açabilir. Bu seçim, hangi belgelerin isteneceğini belirler."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = data.sellerType === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setData((prev) => ({ ...prev, sellerType: option.type }))}
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all",
                isActive
                  ? "border-brand-500 bg-brand-50/60 shadow-glow"
                  : "border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/20"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  isActive ? "bg-brand-500 text-white" : "bg-navy-50 text-navy-500"
                )}
              >
                <option.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-navy-900">{option.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-navy-400">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {errors.sellerType ? (
        <p className="text-xs font-medium text-rose-600">{errors.sellerType}</p>
      ) : null}
    </StepShell>
  );
}
