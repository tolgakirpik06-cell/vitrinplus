import type { Metadata } from "next";
import { OverviewPage } from "@/components/seller/overview/OverviewPage";

export const metadata: Metadata = { title: "Genel Bakış" };

export default function SaticiPanelPage() {
  return <OverviewPage />;
}
