import type { Metadata } from "next";
import { StorePage } from "@/components/seller/pages/StorePage";

export const metadata: Metadata = { title: "Mağazam" };

export default function MagazamPage() {
  return <StorePage />;
}
