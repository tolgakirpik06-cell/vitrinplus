"use client";

import Link from "next/link";
import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { linkButtonClass } from "@/components/dashboard/form";
import { ProductEditor } from "@/components/seller/products/ProductEditor";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";

/** Ürün düzenleme: ürün bu mağazada yoksa boş sayfa yerine açıklayıcı durum gösterir. */
export function EditProductPage({ id }: { id: string }) {
  const { products } = useSellerWorkspace();
  const product = products.find((item) => item.id === id);

  if (!product) {
    return (
      <>
        <PageHeader title="Ürünü Düzenle" breadcrumb={[{ label: "Ürünler", href: sellerHref.products }, { label: "Ürünü Düzenle" }]} />
        <Panel className="mx-auto max-w-2xl">
          <EmptyState
            icon={PackageX}
            title="Ürün bulunamadı"
            description="Bu ürün silinmiş olabilir ya da başka bir mağazaya ait. Ürün listesinden tekrar seçebilirsin."
            action={
              <Link href={sellerHref.products} className={linkButtonClass("primary")}>
                Ürünlerime Dön
              </Link>
            }
          />
        </Panel>
      </>
    );
  }
  return <ProductEditor key={product.id} product={product} />;
}
