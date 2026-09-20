import type { Metadata } from "next";
import { EditProductPage } from "@/components/seller/products/EditProductPage";

export const metadata: Metadata = { title: "Ürünü Düzenle" };

export default async function UrunDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductPage id={decodeURIComponent(id)} />;
}
