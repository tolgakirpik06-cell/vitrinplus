import { perks } from "@/data/perks";
import { cn } from "@/lib/utils";
import type { Perk } from "@/types";

const toneClasses: Record<Perk["tone"], string> = {
  purple: "bg-violet-50 text-violet-600",
  blue: "bg-sky-50 text-sky-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-brand-50 text-brand-600",
};

export function PerksSection() {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-navy-100/70 bg-white p-6 shadow-card sm:p-7">
      <h2 className="mb-5 text-lg font-bold text-navy-900">PazarBuy Ayrıcalıkları</h2>

      <div className="flex flex-1 flex-col gap-2.5">
        {perks.map((perk) => (
          <div
            key={perk.title}
            className="flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-navy-50/60"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                toneClasses[perk.tone]
              )}
            >
              <perk.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy-800">{perk.title}</span>
              <span className="block text-xs leading-relaxed text-navy-400">
                {perk.description}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
