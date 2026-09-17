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
        // Dar ürün kartlarında (320px genişlik, 2 sütunlu grid) "En Mantıklı
        // Seçim" gibi uzun etiketler kartın dışına taşabiliyordu (madde 17) —
        // rozet metni/sistemi (madde 21) korunuyor, sadece gerektiğinde 2
        // satıra sarabiliyor ki kart genişliğini asla aşmasın.
        "inline-flex max-w-[7.5rem] items-center whitespace-normal rounded-full px-2.5 py-1 text-center text-[10px] font-semibold leading-tight ring-1 ring-inset sm:max-w-none sm:whitespace-nowrap sm:text-[11px]",
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
