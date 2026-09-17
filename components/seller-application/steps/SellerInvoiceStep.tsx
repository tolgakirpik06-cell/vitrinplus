"use client";

import type { Dispatch, SetStateAction } from "react";
import { FileStack, Plug, Clock } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { cn } from "@/lib/utils";
import type { InvoicePreference, SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

const options: { value: InvoicePreference; icon: typeof FileStack; title: string; description: string }[] = [
  {
    value: "kendi-sistemim",
    icon: FileStack,
    title: "Kendi fatura sistemimi kullanıyorum",
    description: "Faturalarınızı kendi e-Fatura/e-Arşiv altyapınızla kesmeye devam edin.",
  },
  {
    value: "pazarbuy-entegrasyonu",
    icon: Plug,
    title: "VitrinPlus fatura entegrasyonunu kullanmak istiyorum",
    description: "VitrinPlus'ın e-Fatura entegrasyonu hazır olduğunda otomatik olarak bilgilendirilirsiniz.",
  },
  {
    value: "sonra-ayarlayacagim",
    icon: Clock,
    title: "Daha sonra ayarlayacağım",
    description: "Bu tercihi mağaza panelinizden istediğiniz zaman değiştirebilirsiniz.",
  },
];

export function SellerInvoiceStep({
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
      title="Fatura Bilgileri"
      subtitle="Satışlarınız için fatura sürecinizi nasıl yönetmek istediğinizi seçin."
    >
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isActive = data.invoicePreference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setData((prev) => ({ ...prev, invoicePreference: option.value }))}
              className={cn(
                "flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all",
                isActive
                  ? "border-brand-500 bg-brand-50/60"
                  : "border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/20"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isActive ? "bg-brand-500 text-white" : "bg-navy-50 text-navy-500"
                )}
              >
                <option.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-navy-900">{option.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-navy-400">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      {errors.invoicePreference ? (
        <p className="text-xs font-medium text-rose-600">{errors.invoicePreference}</p>
      ) : null}

      {data.invoicePreference === "pazarbuy-entegrasyonu" ? (
        <p className="rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs leading-relaxed text-navy-500">
          VitrinPlus e-Fatura entegrasyonu şu an geliştirme aşamasındadır. Bu
          tercihi kaydediyoruz; entegrasyon devreye alındığında sizinle
          iletişime geçilecektir.
        </p>
      ) : null}
    </StepShell>
  );
}
