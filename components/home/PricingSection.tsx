import Link from "next/link";
import { pricingPlans } from "@/data/pricing-plans";
import { PricingCard } from "./PricingCard";

export function PricingSection() {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-navy-100/70 bg-white p-6 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy-900">Mağaza Paketleri</h2>
        <Link
          href="/satici"
          className="text-xs font-semibold text-navy-500 hover:text-brand-600"
        >
          Tüm Paketleri Karşılaştır
        </Link>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        {pricingPlans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
