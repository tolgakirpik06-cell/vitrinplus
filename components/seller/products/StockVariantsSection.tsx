"use client";

import { Plus, Trash2 } from "lucide-react";
import { ActionButton, Field, TextInput, Toggle } from "@/components/dashboard/form";
import type { FormErrors, ProductFormState } from "@/lib/product-form";
import { FormSection } from "@/components/seller/products/FormSection";
import type { SetField } from "@/components/seller/products/BasicInfoSection";

export function StockVariantsSection({
  form,
  errors,
  set,
  onGenerateSku,
  activeControl,
}: {
  form: ProductFormState;
  errors: FormErrors;
  set: SetField;
  onGenerateSku: () => void;
  /** Düzenleme modunda "ürün satışta" anahtarı. */
  activeControl?: { active: boolean; onChange: (active: boolean) => void };
}) {
  function updateVariant(id: string, patch: Partial<{ label: string; sku: string }>) {
    set("variants", form.variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  }
  return (
    <FormSection title="Stok ve Varyantlar" id="stok-varyantlar">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stok adedi" required error={errors.stock} htmlFor="p-stock">
          <TextInput id="p-stock" type="number" inputMode="numeric" min={0} step={1} value={form.stock} onChange={(event) => set("stock", event.target.value)} invalid={!!errors.stock} placeholder="0" />
        </Field>
        <Field label="Stok kodu (SKU)" required error={errors.sku} htmlFor="p-sku">
          <div className="flex gap-2">
            <TextInput id="p-sku" value={form.sku} onChange={(event) => set("sku", event.target.value)} invalid={!!errors.sku} placeholder="Örn. AP-001" autoComplete="off" />
            <ActionButton variant="secondary" onClick={onGenerateSku} aria-label="SKU otomatik üret">
              Üret
            </ActionButton>
          </div>
        </Field>
        <Field label="Kritik stok eşiği" error={errors.criticalThreshold} hint="Stok bu değerin altına inince uyarı alırsın (boşsa 5)." htmlFor="p-threshold">
          <TextInput id="p-threshold" type="number" inputMode="numeric" min={0} step={1} value={form.criticalThreshold} onChange={(event) => set("criticalThreshold", event.target.value)} invalid={!!errors.criticalThreshold} placeholder="5" />
        </Field>
        <div className="flex flex-col justify-center gap-3 pt-1 sm:pt-6">
          <Toggle checked={form.autoPassive} onChange={(value) => set("autoPassive", value)} label="Stok bitince otomatik pasife al" description="Stok 0'a düşünce ürün vitrinde gizlenir." />
          {activeControl ? <Toggle checked={activeControl.active} onChange={activeControl.onChange} label="Ürün satışta" description="Kapalıysa ürün vitrinde görünmez (pasif)." /> : null}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[14px] font-bold text-navy-900">Varyantlar</h3>
            <p className="text-xs text-muted">Renk, beden gibi seçenekleri listele. Stok şimdilik ürün düzeyinde takip edilir.</p>
          </div>
          <ActionButton variant="secondary" size="sm" onClick={() => set("variants", [...form.variants, { id: crypto.randomUUID(), label: "", sku: "" }])}>
            <Plus size={13} aria-hidden /> Varyant Ekle
          </ActionButton>
        </div>
        {form.variants.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">Bu ürün için varyant eklenmedi. Tek seçenekli ürünlerde gerekmez.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {form.variants.map((variant, index) => (
              <li key={variant.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
                <TextInput aria-label={`Varyant ${index + 1} adı`} value={variant.label} onChange={(event) => updateVariant(variant.id, { label: event.target.value })} placeholder="Örn. Siyah / 42" />
                <TextInput aria-label={`Varyant ${index + 1} SKU`} value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} placeholder="Varyant SKU" className="col-span-2 sm:col-span-1 sm:order-none" />
                <button
                  type="button"
                  aria-label={`Varyant ${index + 1} sil`}
                  onClick={() => set("variants", form.variants.filter((item) => item.id !== variant.id))}
                  className="row-start-1 col-start-2 flex h-10 w-10 items-center justify-center rounded-lg text-navy-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-royal-500 sm:row-start-auto sm:col-start-auto"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormSection>
  );
}
