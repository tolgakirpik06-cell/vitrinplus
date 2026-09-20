import type { Metadata } from "next";
import { ProductEditor } from "@/components/seller/products/ProductEditor";

export const metadata: Metadata = { title: "Ürün Ekle" };

export default function YeniUrunPage() {
  return <ProductEditor />;
}
