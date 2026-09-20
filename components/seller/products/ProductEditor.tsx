"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageX } from "lucide-react";
import { useCallback, useState } from "react";
import { AuditInfo } from "@/components/dashboard/AuditInfo";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import type { ProductStatus, SellerProduct } from "@/lib/demo-marketplace";
import { CAPACITY_PRICE_PENDING_LABEL, productCapacity } from "@/lib/plans";
import { emptyProductForm, formToProduct, generateSku, productToForm, validateProductForm, type FormErrors, type ProductFormState } from "@/lib/product-form";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";
import { BasicInfoSection, type SetField } from "@/components/seller/products/BasicInfoSection";
import { DescriptionSection } from "@/components/seller/products/DescriptionSection";
import { ImagesSection } from "@/components/seller/products/ImagesSection";
import { PricingSection } from "@/components/seller/products/PricingSection";
import { ProductPreviewModal } from "@/components/seller/products/ProductPreviewModal";
import { ProfitCalculator, type CostField } from "@/components/seller/products/ProfitCalculator";
import { StockVariantsSection } from "@/components/seller/products/StockVariantsSection";

const fieldIds: Partial<Record<keyof ProductFormState, string>> = {
  name: "p-name",
  category: "p-category",
  shortDescription: "p-short",
  price: "p-price",
  salePrice: "p-sale",
  saleEnd: "p-sale-end",
  stock: "p-stock",
  sku: "p-sku",
  criticalThreshold: "p-threshold",
};
const focusOrder: (keyof ProductFormState)[] = ["name", "category", "shortDescription", "price", "salePrice", "saleEnd", "stock", "sku", "criticalThreshold"];

function CapacityReached({ limit, used }: { limit: number; used: number }) {
  return (
    <Panel className="mx-auto max-w-2xl">
      <EmptyState
        icon={PackageX}
        title="Ürün limitine ulaştın"
        description={
          <>
            Paketinin ürün limiti {limit.toLocaleString("tr-TR")} ve {used.toLocaleString("tr-TR")} ürünün var. Yeni ürün eklemek için paketini yükselt ya da ek ürün kapasitesi talep et. Ek kapasite fiyatları: {CAPACITY_PRICE_PENDING_LABEL.toLowerCase()}.
          </>
        }
        action={
          <>
            <Link href={sellerHref.plan} className={linkButtonClass("primary")}>
              Paketimi Yükselt
            </Link>
            <Link href={sellerHref.products} className={linkButtonClass("secondary")}>
              Ürünlerime Dön
            </Link>
          </>
        }
      />
    </Panel>
  );
}

/** Ürün Ekle / Düzenle ekranı (referans 14): form bölümleri solda-sağda, canlı kâr hesaplayıcı sağda. */
export function ProductEditor({ product }: { product?: SellerProduct }) {
  const router = useRouter();
  const toast = useToast();
  const { products, planKey, ops, shop } = useSellerWorkspace();
  const { addProduct, updateProduct } = useSellerData();
  const editing = product !== undefined;
  const isDraft = !editing || product.status === "taslak";

  const [form, setForm] = useState<ProductFormState>(() => (product ? productToForm(product) : emptyProductForm));
  const [active, setActive] = useState(product?.status !== "pasif");
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = useCallback<SetField>((key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  }, []);

  const existingSkus = products.filter((item) => item.id !== product?.id).map((item) => item.sku).filter(Boolean);
  const capacity = productCapacity(planKey, products.length, ops.capacityRequest);

  if (!editing && capacity.reached && capacity.limit !== null) {
    return (
      <>
        <PageHeader title="Ürün Ekle" breadcrumb={[{ label: "Ürünler", href: sellerHref.products }, { label: "Ürün Ekle" }]} />
        <CapacityReached limit={capacity.limit} used={capacity.used} />
      </>
    );
  }

  function save(intent: "draft" | "publish") {
    const found = validateProductForm(form, intent === "draft" ? "draft" : "publish", existingSkus);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Formda düzeltilmesi gereken alanlar var.");
      const first = focusOrder.find((key) => found[key]);
      const target = first ? document.getElementById(fieldIds[first] ?? "") : null;
      target?.focus();
      return;
    }
    const status: ProductStatus = intent === "draft" ? "taslak" : editing && !isDraft ? (active ? "aktif" : "pasif") : "aktif";
    setSaving(true);
    try {
      const input = formToProduct(form, status, product);
      if (editing) updateProduct(product.id, input);
      else addProduct(input);
      toast.success(intent === "draft" ? "Taslak kaydedildi." : editing && !isDraft ? "Ürün güncellendi." : "Ürün satışa yayınlandı.");
      router.push(sellerHref.products);
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Ürün kaydedilemedi.");
    }
  }

  const calculatorErrors: Partial<Record<CostField | "price", string>> = {
    productCost: errors.productCost,
    shipping: errors.shipping,
    packaging: errors.packaging,
    payment: errors.payment,
    other: errors.other,
    price: errors.price,
  };

  return (
    <>
      <PageHeader
        title={editing ? "Ürünü Düzenle" : "Ürün Ekle"}
        description={editing ? `${product.name} ürününün bilgilerini güncelle.` : "Ürününün bilgilerini gir, fiyatını belirle ve satışa başla."}
        breadcrumb={[{ label: "Ürünler", href: sellerHref.products }, { label: editing ? "Ürünü Düzenle" : "Ürün Ekle" }]}
        actions={
          <>
            {isDraft ? (
              <ActionButton variant="secondary" onClick={() => save("draft")} loading={saving}>
                Taslak Olarak Kaydet
              </ActionButton>
            ) : null}
            <ActionButton variant="secondary" onClick={() => setPreviewOpen(true)}>
              Önizle
            </ActionButton>
            <ActionButton variant="primary" onClick={() => save("publish")} loading={saving}>
              {editing && !isDraft ? "Değişiklikleri Kaydet" : "Satışa Yayınla"}
            </ActionButton>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <BasicInfoSection form={form} errors={errors} set={set} />
          <ImagesSection images={form.images} onChange={(images) => set("images", images)} />
          <DescriptionSection form={form} onChange={(value) => set("description", value)} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <ProfitCalculator
            values={form}
            errors={calculatorErrors}
            onChange={(field, value) => set(field, value)}
            onApplyPrice={(price) => {
              set("price", String(price));
              toast.success(`Satış fiyatı ${price.toLocaleString("tr-TR")} TL olarak uygulandı.`);
            }}
          />
          <PricingSection form={form} errors={errors} set={set} />
          <StockVariantsSection
            form={form}
            errors={errors}
            set={set}
            onGenerateSku={() => set("sku", generateSku(existingSkus, form.name))}
            activeControl={editing && !isDraft ? { active, onChange: setActive } : undefined}
          />
          {editing ? <AuditInfo createdAt={product.createdAt} /> : null}
        </div>
      </div>

      <ProductPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} form={form} storeName={shop.settings.storeName} />
    </>
  );
}
