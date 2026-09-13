import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Campaign } from "@/types";
import { cn } from "@/lib/utils";

const backgroundByTone: Record<Campaign["tone"], string> = {
  brand: "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700",
  navy: "bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900",
  violet: "bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900",
  emerald: "bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900",
  sky: "bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900",
  rose: "bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900",
};

const badgeByTone: Record<Campaign["tone"], string> = {
  brand: "bg-white/20 text-white",
  navy: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
  violet: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
  emerald: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
  sky: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
  rose: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
};

export function CampaignCard({
  campaign,
  size = "md",
}: {
  campaign: Campaign;
  size?: "lg" | "md" | "sm";
}) {
  const isLg = size === "lg";
  const isSm = size === "sm";

  return (
    <Link
      href={campaign.href}
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl shadow-premium transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow",
        backgroundByTone[campaign.tone],
        isLg ? "p-6 sm:p-8" : isSm ? "p-4" : "p-5"
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-500 group-hover:scale-125"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            badgeByTone[campaign.tone]
          )}
        >
          {campaign.badge}
        </span>
        <h3
          className={cn(
            "mt-3 text-balance font-extrabold leading-tight text-white",
            isLg ? "text-2xl sm:text-3xl" : isSm ? "text-sm" : "text-lg sm:text-xl"
          )}
        >
          {campaign.title}
        </h3>
        <p
          className={cn(
            "mt-2 text-white/70",
            isLg ? "max-w-sm text-sm sm:text-base" : "text-xs sm:text-sm"
          )}
        >
          {campaign.subtitle}
        </p>
      </div>

      <span
        className={cn(
          "relative mt-4 inline-flex w-fit items-center gap-1.5 font-semibold text-white transition-colors group-hover:text-brand-300",
          isLg ? "text-sm" : "text-xs"
        )}
      >
        {campaign.ctaLabel}
        <ArrowRight size={isLg ? 15 : 13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
