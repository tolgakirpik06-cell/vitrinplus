import type { Metadata } from "next";
import { ReturnsPage } from "@/components/seller/pages/ReturnsPage";

export const metadata: Metadata = { title: "İadeler" };

export default function IadelerPage() {
  return <ReturnsPage />;
}
