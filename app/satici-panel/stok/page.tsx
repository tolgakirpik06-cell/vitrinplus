import type { Metadata } from "next";
import { StockPage } from "@/components/seller/stock/StockPage";

export const metadata: Metadata = { title: "Stok Yönetimi" };

export default function StokPage() {
  return <StockPage />;
}
