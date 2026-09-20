import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/seller/pages/AnalyticsPage";

export const metadata: Metadata = { title: "Analizler" };

export default function AnalizlerPage() {
  return <AnalyticsPage />;
}
