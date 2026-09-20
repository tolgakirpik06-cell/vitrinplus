import type { Metadata } from "next";
import { EarningsPage } from "@/components/seller/pages/EarningsPage";

export const metadata: Metadata = { title: "Kazançlarım" };

export default function KazanclarPage() {
  return <EarningsPage />;
}
