"use client";

import { ArrowRight, Check, Gem, Minus, PackagePlus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ProgressBar } from "@/components/dashboard/charts";
import { ConfirmModal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton } from "@/components/dashboard/form";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { cn } from "@/lib/utils";
import { formatInteger } from "@/lib/format";
import {
  CAPACITY_PRICE_PENDING_LABEL,
  COMMISSION_LABEL,
  UNLIMITED_ORDERS_LABEL,
  capacityAddOns,
  featureLabels,
  planList,
  planPriceLabel,
  productCapacity,
  yearlySavings,
  type Plan,
  type PlanFeatureKey,
} from "@/lib/plans";
import type { BillingPeriod } from "@/lib/seller-ops";

const featureOrder = Object.keys(featureLabels) as PlanFeatureKey[];

function PriceBlock({ plan, billing }: { plan: Plan; billing: BillingPeriod }) {
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  if (price === null) {
    return (
      <div>
        <p className="text-[26px] font-extrabold leading-none text-navy-900">Teklif Al</p>
        <p className="mt-1 text-xs text-muted">Özel fiyatlandırma</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[26px] font-extrabold leading-none tabular-nums text-navy-900">
        {price.toLocaleString("tr-TR")} <span className="text-sm font-bold">TL</span>
        <span className="ml-1 text-xs font-semibold text-muted">/ {billing === "monthly" ? "ay" : "yıl"}</span>
      </p>
      <p className="mt-1 text-xs text-emerald-600">{billing === "yearly" && yearlySavings(plan) > 0 ? `Aylığa göre ${yearlySavings(plan).toLocaleString("tr-TR")} TL tasarruf` : " "}</p>
    </div>
  );
}

/**
 * Paketim: mevcut paket, kullanım, paket karşılaştırma ve ek kapasite talebi.
 * Fiyatlar `lib/plans.ts` içindeki tek kaynaktan gelir. Ek kapasite fiyatları belirlenmemiştir; hiçbir fiyat gösterilmez.
 * Paket değişimi demodur: ödeme alınmaz.
 */
export function PlanPage() {
  const toast = useToast();
  const { plan, planKey, ops, products, updateOps } = useSellerWorkspace();
  const [billing, setBilling] = useState<BillingPeriod>(ops.billing);
  const [target, setTarget] = useState<Plan | null>(null);
  const [addOnKey, setAddOnKey] = useState<string>(ops.capacityRequest ?? "");

  const capacity = productCapacity(planKey, products.length, ops.capacityRequest);
  const requested = capacityAddOns.find((item) => item.key === ops.capacityRequest);
  const overLimit = target && target.productLimit !== null && products.length > target.productLimit;

  function safely(action: () => void, success: string) {
    try {
      action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem kaydedilemedi.");
    }
  }

  function confirmSwitch() {
    if (!target) return;
    const next = target;
    safely(() => updateOps((current) => ({ ...current, planKey: next.key, billing })), `${next.name} paketine geçildi (demo; ödeme alınmadı).`);
    setTarget(null);
  }

  return (
    <>
      <PageHeader title="Paketim" description="Paketini, ürün kapasiteni ve açık özelliklerini yönet." />
      <div className="flex flex-col gap-5">
        <section aria-label="Mevcut paket" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar via-royal-800 to-royal-600 p-5 text-white shadow-royal sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-royal-100">
                <Gem size={13} aria-hidden /> Mevcut Paket
              </p>
              <h2 className="mt-1 text-[26px] font-extrabold leading-tight">{plan.name}</h2>
              <p className="mt-1 text-[13px] text-royal-100">{plan.tagline}</p>
              <p className="mt-2 text-sm font-semibold">{planPriceLabel(plan, ops.billing)}</p>
            </div>
            <ul className="flex flex-wrap gap-2 text-xs font-semibold">
              {[COMMISSION_LABEL, UNLIMITED_ORDERS_LABEL, plan.adAdvantageLabel].map((chip) => (
                <li key={chip} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                  <ShieldCheck size={13} aria-hidden /> {chip}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-5 max-w-xl">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span>Ürün Kapasitesi</span>
              <span className="tabular-nums">{capacity.limit === null ? `${formatInteger(capacity.used)} ürün · özel kapasite` : `${formatInteger(capacity.used)} / ${formatInteger(capacity.limit)} ürün`}</span>
            </div>
            <ProgressBar value={capacity.ratio * 100} tone={capacity.ratio >= 0.9 ? "danger" : capacity.ratio >= 0.7 ? "warning" : "brand"} label="Ürün kapasitesi kullanımı" className="!bg-white/20" />
            {requested ? <p className="mt-2 text-[11.5px] text-royal-100">Ek kapasite talebin: {requested.label} · {CAPACITY_PRICE_PENDING_LABEL}</p> : null}
          </div>
        </section>

        <section aria-label="Paket karşılaştırma">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-navy-900">Paketler</h2>
            <Tabs
              variant="segment"
              label="Ödeme dönemi"
              value={billing}
              onChange={setBilling}
              items={[
                { key: "monthly", label: "Aylık" },
                { key: "yearly", label: "Yıllık" },
              ]}
            />
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {planList.map((item) => {
              const current = item.key === planKey;
              const enterprise = item.monthlyPrice === null;
              return (
                <li key={item.key} className="min-w-0">
                  <div className={cn("relative flex h-full flex-col gap-4 rounded-2xl border bg-white p-5 shadow-panel", item.featured ? "border-royal-400 ring-1 ring-royal-300" : "border-line")}>
                    {item.badge ? <span className="absolute -top-2.5 left-5 rounded-full bg-royal-600 px-2.5 py-0.5 text-[10.5px] font-bold text-white">{item.badge}</span> : null}
                    <div>
                      <h3 className="text-[16px] font-extrabold text-navy-900">{item.name}</h3>
                      <p className="mt-0.5 min-h-8 text-xs text-muted">{item.tagline}</p>
                    </div>
                    <PriceBlock plan={item} billing={billing} />
                    <p className="rounded-lg bg-royal-50 px-3 py-2 text-center text-[13px] font-bold text-royal-700">{item.productLimitLabel}</p>
                    <ul className="flex-1 space-y-1.5 text-[12.5px] text-navy-600">
                      {item.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5">
                          <Check size={14} aria-hidden className="mt-0.5 shrink-0 text-emerald-500" /> {feature}
                        </li>
                      ))}
                    </ul>
                    {current ? (
                      <ActionButton variant="secondary" disabled className="w-full">
                        Mevcut Paket
                      </ActionButton>
                    ) : enterprise ? (
                      ops.enterpriseRequested ? (
                        <ActionButton variant="secondary" className="w-full" onClick={() => safely(() => updateOps((currentOps) => ({ ...currentOps, enterpriseRequested: false })), "Teklif talebi geri çekildi.")}>
                          Talep Alındı · Geri Çek
                        </ActionButton>
                      ) : (
                        <ActionButton variant="primary" className="w-full" onClick={() => safely(() => updateOps((currentOps) => ({ ...currentOps, enterpriseRequested: true })), "Teklif talebin demo olarak kaydedildi. Gerçek bir bildirim gönderilmez.")}>
                          {item.ctaLabel} <ArrowRight size={14} aria-hidden />
                        </ActionButton>
                      )
                    ) : (
                      <ActionButton variant={item.featured ? "primary" : "secondary"} className="w-full" onClick={() => setTarget(item)}>
                        {item.ctaLabel}
                      </ActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Tüm paketlerde {COMMISSION_LABEL.toLowerCase()} ve {UNLIMITED_ORDERS_LABEL.toLowerCase()} vardır. Paket değişimi demodur; gerçek ödeme alınmaz.</p>
        </section>

        <Panel aria-label="Ek ürün kapasitesi">
          <PanelHeader title="Ek Ürün Kapasitesi" subtitle="Paket limitini aşman gerekirse ek kapasite talep edebilirsin." action={<PackagePlus size={18} aria-hidden className="text-navy-300" />} />
          <p role="note" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Ek kapasite fiyatları henüz belirlenmedi. <strong>{CAPACITY_PRICE_PENDING_LABEL}.</strong> Şimdilik yalnızca talebini kaydedebilirsin; bir ücret uygulanmaz.
          </p>
          <fieldset>
            <legend className="sr-only">Ek kapasite seçenekleri</legend>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {capacityAddOns.map((option) => {
                const selected = addOnKey === option.key;
                return (
                  <li key={option.key}>
                    <label className={cn("flex h-full cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors focus-within:outline-2 focus-within:outline-royal-500", selected ? "border-royal-400 bg-royal-50/50" : "border-line hover:border-royal-200")}>
                      <span className="flex items-center gap-2 text-[13px] font-bold text-navy-900">
                        <input type="radio" name="capacity" value={option.key} checked={selected} onChange={() => setAddOnKey(option.key)} className="h-4 w-4 accent-royal-600" />
                        {option.label}
                      </span>
                      <span className="pl-6 text-[11px] text-muted">{CAPACITY_PRICE_PENDING_LABEL}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton
              variant="primary"
              disabled={!addOnKey || addOnKey === ops.capacityRequest}
              onClick={() => safely(() => updateOps((current) => ({ ...current, capacityRequest: addOnKey })), "Ek kapasite talebin kaydedildi. Fiyat belirlendiğinde bilgilendirileceksin.")}
            >
              Kapasite Talep Et
            </ActionButton>
            {ops.capacityRequest ? (
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setAddOnKey("");
                  safely(() => updateOps((current) => ({ ...current, capacityRequest: null })), "Ek kapasite talebi kaldırıldı.");
                }}
              >
                Talebi Kaldır
              </ActionButton>
            ) : null}
            {requested ? <StatusBadge tone="brand">Talep: {requested.label}</StatusBadge> : null}
          </div>
        </Panel>

        <Panel aria-label="Özellik karşılaştırma" padded={false} className="overflow-hidden">
          <div className="p-5 pb-3">
            <PanelHeader title="Özellik Karşılaştırma" subtitle="Kilitli özellikler yükseltince açılır." className="!mb-0" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <caption className="sr-only">Paketlere göre özellikler</caption>
              <thead>
                <tr className="bg-navy-50/70 text-xs font-semibold text-muted">
                  <th scope="col" className="px-5 py-2.5 text-left">
                    Özellik
                  </th>
                  {planList.map((item) => (
                    <th key={item.key} scope="col" className={cn("px-3 py-2.5 text-center", item.key === planKey && "text-royal-700")}>
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {featureOrder.map((feature) => (
                  <tr key={feature}>
                    <th scope="row" className="px-5 py-2 text-left font-medium text-navy-700">
                      {featureLabels[feature]}
                    </th>
                    {planList.map((item) => {
                      const has = item.unlocks.includes(feature);
                      return (
                        <td key={item.key} className="px-3 py-2 text-center">
                          {has ? <Check size={16} aria-hidden className="mx-auto text-emerald-500" /> : <Minus size={16} aria-hidden className="mx-auto text-navy-200" />}
                          <span className="sr-only">{has ? "Var" : "Yok"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <ConfirmModal
        open={target !== null}
        onClose={() => setTarget(null)}
        tone="primary"
        title={target ? `${target.name} paketine geçilsin mi?` : ""}
        confirmLabel="Paketi Değiştir"
        description={
          target ? (
            <>
              {planPriceLabel(target, billing)}. Bu bir demodur; gerçek ödeme alınmaz.
              {overLimit && target.productLimit !== null ? ` Ürün sayın (${formatInteger(products.length)}) yeni paketin limitini (${formatInteger(target.productLimit)}) aşıyor: mevcut ürünlerin korunur ancak yeni ürün ekleyemezsin.` : ""}
            </>
          ) : null
        }
        onConfirm={confirmSwitch}
      />
    </>
  );
}
