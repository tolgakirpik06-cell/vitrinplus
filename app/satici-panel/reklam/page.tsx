import type { Metadata } from "next";
import { AdsPage } from "@/components/seller/pages/AdsPage";

export const metadata: Metadata = { title: "Reklam Ver" };

export default function ReklamPage() {
  return <AdsPage />;
}
