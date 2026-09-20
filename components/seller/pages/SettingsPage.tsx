"use client";

import { Database, KeyRound, Truck, Users } from "lucide-react";
import { useId, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { useToast } from "@/components/dashboard/Toast";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { ActionButton, Field, TextInput, UnitInput } from "@/components/dashboard/form";
import { ConfirmModal } from "@/components/dashboard/Modal";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { useSampleData } from "@/components/seller/useSampleData";
import type { SellerShipping } from "@/lib/demo-marketplace";
import { hasFeature } from "@/lib/plans";
import { CARRIERS } from "@/lib/seller-orders";

type ShippingForm = { shippingFee: string; freeShippingThreshold: string; preparationDays: string; carrier: string };
type Errors = Partial<Record<keyof ShippingForm, string>>;

const toForm = (shipping: SellerShipping): ShippingForm => ({
  shippingFee: String(shipping.shippingFee),
  freeShippingThreshold: String(shipping.freeShippingThreshold),
  preparationDays: String(shipping.preparationDays),
  carrier: shipping.carrier,
});

function parseNonNegative(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function ShippingSection() {
  const toast = useToast();
  const { shipping, updateShipping } = useSellerData();
  const [form, setForm] = useState<ShippingForm>(toForm(shipping));
  const [errors, setErrors] = useState<Errors>({});
  const ids = { fee: useId(), free: useId(), days: useId(), carrier: useId(), list: useId() };
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(shipping));

  function set(key: keyof ShippingForm, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function save() {
    const fee = parseNonNegative(form.shippingFee);
    const free = parseNonNegative(form.freeShippingThreshold);
    const days = parseNonNegative(form.preparationDays);
    const found: Errors = {};
    if (fee === null) found.shippingFee = "0 veya daha büyük bir tutar gir.";
    if (free === null) found.freeShippingThreshold = "0 veya daha büyük bir tutar gir.";
    if (days === null || !Number.isInteger(days) || days > 30) found.preparationDays = "0 ile 30 arasında bir gün sayısı gir.";
    if (!form.carrier.trim()) found.carrier = "Kargo firması boş olamaz.";
    setErrors(found);
    if (Object.keys(found).length > 0 || fee === null || free === null || days === null) return;
    try {
      updateShipping({ shippingFee: fee, freeShippingThreshold: free, preparationDays: days, carrier: form.carrier.trim() });
      toast.success("Kargo ayarları kaydedildi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kargo ayarları kaydedilemedi.");
    }
  }

  return (
    <Panel aria-label="Kargo ayarları">
      <PanelHeader title="Kargo Ayarları" subtitle="Bu ayarlar mağaza taslağı olarak saklanır. Demo ödemede tüm mağazalar için 250 TL üzeri ücretsiz, altında 49,90 TL standart kargo uygulanır." action={<Truck size={18} aria-hidden className="text-navy-300" />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kargo Ücreti" htmlFor={ids.fee} error={errors.shippingFee}>
          <UnitInput id={ids.fee} unit="TL" min={0} step="0.01" value={form.shippingFee} invalid={Boolean(errors.shippingFee)} onChange={(event) => set("shippingFee", event.target.value)} />
        </Field>
        <Field label="Ücretsiz Kargo Eşiği" htmlFor={ids.free} error={errors.freeShippingThreshold}>
          <UnitInput id={ids.free} unit="TL" min={0} step="0.01" value={form.freeShippingThreshold} invalid={Boolean(errors.freeShippingThreshold)} onChange={(event) => set("freeShippingThreshold", event.target.value)} />
        </Field>
        <Field label="Hazırlama Süresi" htmlFor={ids.days} error={errors.preparationDays} hint="Bu süreyi aşan siparişler “geciken” sayılır.">
          <UnitInput id={ids.days} unit="gün" min={0} value={form.preparationDays} invalid={Boolean(errors.preparationDays)} onChange={(event) => set("preparationDays", event.target.value)} />
        </Field>
        <Field label="Varsayılan Kargo Firması" htmlFor={ids.carrier} error={errors.carrier}>
          <TextInput id={ids.carrier} list={ids.list} value={form.carrier} invalid={Boolean(errors.carrier)} onChange={(event) => set("carrier", event.target.value)} />
          <datalist id={ids.list}>
            {CARRIERS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-4">
        <ActionButton variant="primary" disabled={!dirty} onClick={save}>
          Kaydet
        </ActionButton>
      </div>
    </Panel>
  );
}

function SampleDataSection() {
  const sample = useSampleData();
  const [confirm, setConfirm] = useState(false);
  return (
    <Panel aria-label="Demo verisi">
      <PanelHeader title="Demo Verisi" subtitle="Paneli dolu bir mağaza gibi denemek için örnek ürün, sipariş ve müşteri sorusu yükle. Yalnızca örnek olarak işaretli kayıtlar kaldırılır; kendi verilerine dokunulmaz." action={<Database size={18} aria-hidden className="text-navy-300" />} />
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton variant="primary" disabled={sample.loaded} onClick={sample.load}>
          Örnek Veri Yükle
        </ActionButton>
        <ActionButton variant="danger" disabled={!sample.loaded} onClick={() => setConfirm(true)}>
          Örnek Veriyi Kaldır
        </ActionButton>
        <span className="text-xs text-muted">{sample.loaded ? "Örnek veri yüklü." : "Örnek veri yüklü değil."}</span>
      </div>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Örnek veri kaldırılsın mı?"
        confirmLabel="Kaldır"
        description="Örnek olarak yüklenen ürünler, siparişler ve sorular silinir. Kendi eklediğin kayıtlar korunur."
        onConfirm={() => {
          sample.remove();
          setConfirm(false);
        }}
      />
    </Panel>
  );
}

/** Ayarlar: kargo (eski Kargo Ayarları korunur), demo verisi ve pakete bağlı gelişmiş özellikler. */
export function SettingsPage() {
  const { planKey } = useSellerWorkspace();
  return (
    <>
      <PageHeader title="Ayarlar" description="Kargo tercihlerini ve hesap ayarlarını yönet." />
      <div className="flex flex-col gap-5">
        <ShippingSection />
        <SampleDataSection />
        <section aria-label="Gelişmiş özellikler" className="grid gap-5 lg:grid-cols-2">
          {hasFeature(planKey, "staffAccounts") ? (
            <Panel className="flex items-start gap-3">
              <Users size={20} aria-hidden className="mt-0.5 text-royal-600" />
              <div>
                <h2 className="text-[14px] font-bold text-navy-900">Personel ve Roller</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">Paketinde açık. Personel hesapları ve rol yönetimi sonraki aşamada eklenecek.</p>
              </div>
            </Panel>
          ) : (
            <UpgradeLock feature="staffAccounts" currentPlan={planKey} />
          )}
          {hasFeature(planKey, "apiAccess") ? (
            <Panel className="flex items-start gap-3">
              <KeyRound size={20} aria-hidden className="mt-0.5 text-royal-600" />
              <div>
                <h2 className="text-[14px] font-bold text-navy-900">API Erişimi</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">Paketinde açık. API anahtarları ve entegrasyon araçları sonraki aşamada eklenecek.</p>
              </div>
            </Panel>
          ) : (
            <UpgradeLock feature="apiAccess" currentPlan={planKey} />
          )}
        </section>
      </div>
    </>
  );
}
