import type { Metadata } from "next";
import { PayoutsPage } from "@/components/seller/pages/PayoutsPage";

export const metadata: Metadata = { title: "Ödemeler" };

export default function OdemelerPage() {
  return <PayoutsPage />;
}
