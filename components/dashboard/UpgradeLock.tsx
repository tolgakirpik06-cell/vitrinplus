import Link from "next/link";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { featureLabels, getPlan, planPriceLabel, requiredPlanFor, type PlanFeatureKey, type PlanKey, type UpgradeSuggestion } from "@/lib/plans";
import { Panel } from "@/components/dashboard/Panel";
import { linkButtonClass } from "@/components/dashboard/form";

export const PLAN_PAGE_HREF = "/satici-panel/paketim";

/**
 * Kilitli özellik: boş sayfa yerine neyin kilitli olduğunu, hangi pakette
 * açıldığını ve yükseltme yolunu gösterir. `children` varsa önizleme olarak bulanık gösterilir.
 */
export function UpgradeLock({
  feature,
  currentPlan,
  title,
  description,
  variant = "card",
  children,
  className,
}: {
  feature: PlanFeatureKey;
  currentPlan: PlanKey;
  title?: string;
  description?: ReactNode;
  variant?: "page" | "card" | "inline";
  children?: ReactNode;
  className?: string;
}) {
  const required = requiredPlanFor(feature);
  const current = getPlan(currentPlan);
  const heading = title ?? `${featureLabels[feature]} ${required.name} ile açılır`;
  const body = description ?? `${current.name} paketindesin. ${featureLabels[feature]} özelliği ${required.name} ve üzeri paketlerde kullanılabilir.`;

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3", className)}>
        <Lock size={16} aria-hidden className="shrink-0 text-amber-600" />
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-900">
          <span className="font-bold">{heading}.</span> {body}
        </p>
        <Link href={PLAN_PAGE_HREF} className={linkButtonClass("soft", "sm")}>
          Paketini Yükselt <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <Panel className={cn(variant === "page" ? "mx-auto max-w-2xl py-10 text-center" : "text-center", className)}>
      <span aria-hidden className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <Lock size={24} />
      </span>
      <h2 className="text-lg font-extrabold text-navy-900">{heading}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">{body}</p>
      <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left text-xs text-navy-600 sm:grid-cols-2">
        {required.features.slice(0, 6).map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <Check size={14} aria-hidden className="mt-0.5 shrink-0 text-emerald-500" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href={PLAN_PAGE_HREF} className={linkButtonClass("primary")}>
          {required.ctaLabel} <ArrowRight size={14} aria-hidden />
        </Link>
        <span className="text-xs text-muted">{required.monthlyPrice === null ? "Özel teklif" : planPriceLabel(required)}</span>
      </div>
      {children ? <div className="pointer-events-none mt-6 select-none opacity-50 blur-[1.5px]" aria-hidden>{children}</div> : null}
    </Panel>
  );
}

/** Bağlama duyarlı yükseltme önerisi (herkese gösterilmez; `suggestUpgrade` null döndürürse çağıran render etmez). */
export function UpgradeSuggestionCard({ suggestion, className }: { suggestion: UpgradeSuggestion; className?: string }) {
  const { target } = suggestion;
  return (
    <section
      aria-label="Paket önerisi"
      className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal-700 via-royal-600 to-violet-600 p-5 text-white shadow-royal", className)}
    >
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-royal-100">
        <Sparkles size={13} aria-hidden /> {suggestion.tone === "enterprise" ? "Büyük hedefler için" : "Sana özel öneri"}
      </p>
      <h3 className="mt-2 text-xl font-extrabold leading-tight">{target.name}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-royal-100">{suggestion.reason}</p>
      <Link href={PLAN_PAGE_HREF} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-bold text-royal-700 transition-colors hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {target.monthlyPrice === null ? "Teklif Al" : "Paketleri İncele"} <ArrowRight size={13} aria-hidden />
      </Link>
    </section>
  );
}

/** Butonun yanında küçük paket rozeti (ör. "Plus"). */
export function PlanPill({ feature, className }: { feature: PlanFeatureKey; className?: string }) {
  const required = requiredPlanFor(feature);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20", className)}>
      <Lock size={10} aria-hidden /> {required.name.replace("Vitrin ", "")}
    </span>
  );
}
