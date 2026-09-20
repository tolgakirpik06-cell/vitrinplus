import type { Metadata } from "next";
import { CampaignsPage } from "@/components/seller/pages/CampaignsPage";

export const metadata: Metadata = { title: "Kampanyalar" };

export default function KampanyalarPage() {
  return <CampaignsPage />;
}
