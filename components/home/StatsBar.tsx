import { PackageCheck } from "lucide-react";
import { stats } from "@/data/stats";

export function StatsBar() {
  return (
    <section className="rounded-3xl bg-navy-900 px-5 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-400">
                <stat.icon size={19} />
              </span>
              <span>
                <span className="block text-lg font-extrabold text-white sm:text-xl">
                  {stat.value}
                </span>
                <span className="block text-xs text-navy-300">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 lg:shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
            <PackageCheck size={22} />
          </span>
          <p className="text-sm font-semibold text-white">
            Türkiye&apos;nin yeni nesil
            <br className="hidden sm:block" /> AI pazaryeri
          </p>
        </div>
      </div>
    </section>
  );
}
