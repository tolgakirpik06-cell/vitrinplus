import Link from "next/link";
import { ChevronRight, Megaphone } from "lucide-react";
import { catalogCampaigns } from "@/lib/catalog-campaigns";
import { CatalogEmpty } from "@/components/ui/CatalogEmpty";
import { CampaignCard } from "@/components/ui/CampaignCard";

export async function CampaignsSection() {
  const items = await catalogCampaigns();

  return (
    <section aria-labelledby="kampanyalar-baslik">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="kampanyalar-baslik" className="flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Megaphone size={16} />
          </span>
          Kampanyalar
        </h2>
        <Link
          href="/kampanyalar"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-500 transition-colors hover:text-brand-600"
        >
          Tümünü Gör
          <ChevronRight size={16} />
        </Link>
      </div>

      {items.length === 0 && <CatalogEmpty message="Şu anda yayında indirimli ürün yok." />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} size="md" />
        ))}
      </div>
    </section>
  );
}
