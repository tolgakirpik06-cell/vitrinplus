import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CampaignCard } from "@/components/ui/CampaignCard";
import { campaigns } from "@/data/campaigns";

export const metadata: Metadata = { title: "Kampanyalar | PazarBuy" };

export default function KampanyalarPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Kampanyalar" }]} />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Megaphone size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Kampanyalar</h1>
            <p className="mt-1 text-sm text-navy-400">Güncel indirim ve fırsatları kaçırma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign, index) => (
            <CampaignCard key={campaign.id} campaign={campaign} size={index === 0 ? "lg" : "md"} />
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
