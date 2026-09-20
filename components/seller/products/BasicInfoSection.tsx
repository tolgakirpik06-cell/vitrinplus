"use client";

import { useMemo } from "react";
import { Field, SelectInput, TextArea, TextInput } from "@/components/dashboard/form";
import { navCategories } from "@/data/categories";
import { SHORT_DESCRIPTION_LIMIT, type FormErrors, type ProductFormState } from "@/lib/product-form";
import { FormSection } from "@/components/seller/products/FormSection";

export type SetField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;

export function BasicInfoSection({ form, errors, set }: { form: ProductFormState; errors: FormErrors; set: SetField }) {
  const categoryOptions = useMemo(() => {
    const names = navCategories.map((category) => category.name);
    if (form.category && !names.includes(form.category)) names.unshift(form.category);
    return names;
  }, [form.category]);

  return (
    <FormSection title="Temel Bilgiler" id="temel-bilgiler">
      <div className="flex flex-col gap-4">
        <Field label="Ürün Adı" required error={errors.name} htmlFor="p-name">
          <TextInput id="p-name" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Örn. Kablosuz Bluetooth Kulaklık" invalid={!!errors.name} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Kategori" required error={errors.category} htmlFor="p-category">
          <SelectInput id="p-category" value={form.category} onChange={(event) => set("category", event.target.value)} invalid={!!errors.category}>
            <option value="">Kategori seç</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="Genel">Diğer / Genel</option>
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marka" htmlFor="p-brand" hint="Boş bırakırsan mağaza adın marka olarak gösterilir.">
            <TextInput id="p-brand" value={form.brand} onChange={(event) => set("brand", event.target.value)} placeholder="Örn. Nova" autoComplete="off" />
          </Field>
          <Field label="Model" htmlFor="p-model">
            <TextInput id="p-model" value={form.model} onChange={(event) => set("model", event.target.value)} placeholder="Örn. KP-500" autoComplete="off" />
          </Field>
        </div>
        <Field label="Kısa Açıklama" error={errors.shortDescription} htmlFor="p-short">
          <TextArea id="p-short" value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} placeholder="Ürünü tek cümleyle anlat." invalid={!!errors.shortDescription} rows={3} />
          <p className="text-right text-[11px] tabular-nums text-muted">
            {form.shortDescription.length}/{SHORT_DESCRIPTION_LIMIT}
          </p>
        </Field>
      </div>
    </FormSection>
  );
}
