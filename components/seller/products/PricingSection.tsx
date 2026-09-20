"use client";

import { Field, TextInput, UnitInput } from "@/components/dashboard/form";
import { formatPercent } from "@/lib/format";
import { toNumber, type FormErrors, type ProductFormState } from "@/lib/product-form";
import { FormSection } from "@/components/seller/products/FormSection";
import type { SetField } from "@/components/seller/products/BasicInfoSection";

export function PricingSection({ form, errors, set }: { form: ProductFormState; errors: FormErrors; set: SetField }) {
  const price = toNumber(form.price);
  const sale = toNumber(form.salePrice);
  const discount = !Number.isNaN(price) && !Number.isNaN(sale) && price > 0 && sale > 0 && sale < price ? (1 - sale / price) * 100 : null;
  return (
    <FormSection title="Fiyatlandırma" id="fiyatlandirma">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Satış fiyatı" required error={errors.price} htmlFor="p-price">
          <UnitInput id="p-price" unit="TL" min={0} step="0.01" value={form.price} onChange={(event) => set("price", event.target.value)} invalid={!!errors.price} placeholder="0" />
        </Field>
        <Field label="İndirimli fiyat (opsiyonel)" error={errors.salePrice} hint={discount !== null ? `${formatPercent(discount, 0)} indirim` : undefined} htmlFor="p-sale">
          <UnitInput id="p-sale" unit="TL" min={0} step="0.01" value={form.salePrice} onChange={(event) => set("salePrice", event.target.value)} invalid={!!errors.salePrice} placeholder="0" />
        </Field>
        <Field label="İndirim başlangıç" htmlFor="p-sale-start">
          <TextInput id="p-sale-start" type="date" value={form.saleStart} onChange={(event) => set("saleStart", event.target.value)} />
        </Field>
        <Field label="İndirim bitiş" error={errors.saleEnd} htmlFor="p-sale-end">
          <TextInput id="p-sale-end" type="date" value={form.saleEnd} min={form.saleStart || undefined} onChange={(event) => set("saleEnd", event.target.value)} invalid={!!errors.saleEnd} />
        </Field>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">İndirimli fiyat yalnızca seçtiğin tarih aralığında müşteriye gösterilir. Ürün maliyetin müşteriye hiçbir zaman gösterilmez.</p>
    </FormSection>
  );
}
