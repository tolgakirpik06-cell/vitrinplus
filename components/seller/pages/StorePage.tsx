"use client";

import { Mail, Package, Phone } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/components/dashboard/Toast";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { ActionButton, Field, TextArea, TextInput } from "@/components/dashboard/form";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { activeSalePrice, isSellable, type SellerSettings } from "@/lib/demo-marketplace";
import { formatTL } from "@/lib/format";
import { hasFeature } from "@/lib/plans";

type Errors = Partial<Record<keyof SellerSettings, string>>;

function validate(form: SellerSettings): Errors {
  const errors: Errors = {};
  if (form.storeName.trim().length < 3) errors.storeName = "Mağaza adı en az 3 karakter olmalı.";
  if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) errors.contactEmail = "Geçerli bir e-posta adresi yaz.";
  if (form.contactPhone.trim() && form.contactPhone.replace(/[^\d]/g, "").length < 10) errors.contactPhone = "Telefon numarası en az 10 haneli olmalı.";
  return errors;
}

/** Mağazam: mağaza bilgileri (eski Mağaza Ayarları korunur) ve müşterinin göreceği vitrin önizlemesi. */
export function StorePage() {
  const toast = useToast();
  const { shop, planKey, plan, products, now } = useSellerWorkspace();
  const { updateSettings } = useSellerData();
  const [form, setForm] = useState<SellerSettings>(shop.settings);
  const [errors, setErrors] = useState<Errors>({});
  const ids = { name: useId(), email: useId(), phone: useId(), desc: useId() };

  const dirty = (Object.keys(form) as (keyof SellerSettings)[]).some((key) => form[key] !== shop.settings[key]);
  const live = products.filter(isSellable);

  function set<K extends keyof SellerSettings>(key: K, value: SellerSettings[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function save() {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Formda düzeltilmesi gereken alanlar var.");
      return;
    }
    try {
      updateSettings({ storeName: form.storeName.trim(), description: form.description.trim(), contactEmail: form.contactEmail.trim(), contactPhone: form.contactPhone.trim() });
      toast.success("Mağaza bilgileri kaydedildi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mağaza bilgileri kaydedilemedi.");
    }
  }

  return (
    <>
      <PageHeader title="Mağazam" description="Müşterilerin gördüğü mağaza bilgilerini yönet." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel aria-label="Mağaza bilgileri">
            <PanelHeader title="Mağaza Bilgileri" action={<StatusBadge tone="brand">{plan.name} Paket</StatusBadge>} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mağaza Adı" required htmlFor={ids.name} error={errors.storeName} className="sm:col-span-2">
                <TextInput id={ids.name} value={form.storeName} invalid={Boolean(errors.storeName)} maxLength={60} onChange={(event) => set("storeName", event.target.value)} />
              </Field>
              <Field label="İletişim E-postası" htmlFor={ids.email} error={errors.contactEmail}>
                <TextInput id={ids.email} type="email" value={form.contactEmail} invalid={Boolean(errors.contactEmail)} onChange={(event) => set("contactEmail", event.target.value)} />
              </Field>
              <Field label="İletişim Telefonu" htmlFor={ids.phone} error={errors.contactPhone}>
                <TextInput id={ids.phone} value={form.contactPhone} invalid={Boolean(errors.contactPhone)} placeholder="05xx xxx xx xx" onChange={(event) => set("contactPhone", event.target.value)} />
              </Field>
              <Field label="Mağaza Açıklaması" htmlFor={ids.desc} hint={`${form.description.length}/500`} className="sm:col-span-2">
                <TextArea id={ids.desc} value={form.description} maxLength={500} onChange={(event) => set("description", event.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ActionButton variant="primary" disabled={!dirty} onClick={save}>
                Kaydet
              </ActionButton>
              <ActionButton variant="secondary" disabled={!dirty} onClick={() => { setForm(shop.settings); setErrors({}); }}>
                Değişiklikleri Geri Al
              </ActionButton>
              <span className="ml-auto text-xs text-muted">Başvuru ref. no: {shop.reference}</span>
            </div>
          </Panel>

          {hasFeature(planKey, "advancedStoreCustomization") ? (
            <p role="note" className="rounded-xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-muted shadow-panel">Gelişmiş mağaza özelleştirme (kapak görseli, tema ve banner düzeni) paketinde açık; düzenleme araçları sonraki aşamada eklenecek.</p>
          ) : (
            <UpgradeLock variant="inline" feature="advancedStoreCustomization" currentPlan={planKey} />
          )}
        </div>

        <Panel aria-label="Mağaza önizlemesi">
          <PanelHeader title="Müşteri Görünümü" subtitle="Mağaza kartın ve satıştaki ürünlerin." />
          <div className="rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center gap-3">
              <ProductThumb name={form.storeName || "Mağaza"} size={48} className="rounded-2xl" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-navy-900">{form.storeName || "Mağaza adı"}</p>
                <p className="text-xs text-muted">{live.length} ürün satışta</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-navy-600">{form.description || "Mağaza açıklaması eklemediğin için ürün sayfalarında genel bir metin gösterilir."}</p>
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {form.contactEmail ? (
                <li className="flex items-center gap-1.5">
                  <Mail size={12} aria-hidden /> {form.contactEmail}
                </li>
              ) : null}
              {form.contactPhone ? (
                <li className="flex items-center gap-1.5">
                  <Phone size={12} aria-hidden /> {form.contactPhone}
                </li>
              ) : null}
            </ul>
          </div>
          <h3 className="mb-2 mt-5 text-[13px] font-extrabold text-navy-900">Satıştaki Ürünler</h3>
          {live.length === 0 ? (
            <EmptyState compact icon={Package} title="Satışta ürün yok" description="Aktif ürünlerin burada ve vitrinde görünür." />
          ) : (
            <ul className="divide-y divide-line/80">
              {live.slice(0, 6).map((product) => {
                const sale = activeSalePrice(product, now);
                return (
                  <li key={product.id} className="flex items-center gap-3 py-2">
                    <ProductThumb name={product.name} image={product.images?.[0]} size={36} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-navy-800">{product.name}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-navy-900">{formatTL(sale ?? product.price)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
