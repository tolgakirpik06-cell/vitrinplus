import type { Metadata } from "next";
import { ProductsPage } from "@/components/seller/products/ProductsPage";

export const metadata: Metadata = { title: "Ürünler" };

export default function UrunlerPage() {
  return <ProductsPage />;
}
