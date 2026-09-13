import { campaigns } from "@/data/campaigns";
import { CampaignCard } from "@/components/ui/CampaignCard";
import { HeroBanner } from "@/components/home/HeroBanner";

export function PromoBanners() {
  const [main, second, third] = campaigns;

  return (
    <section aria-label="Kampanya bannerları" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <HeroBanner campaign={main} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
        <CampaignCard campaign={second} size="sm" />
        <CampaignCard campaign={third} size="sm" />
      </div>
    </section>
  );
}
