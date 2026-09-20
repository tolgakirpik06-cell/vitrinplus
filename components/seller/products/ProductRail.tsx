"use client";

import Link from "next/link";
import { Check, Crown, Lock, Sparkles, UploadCloud, X } from "lucide-react";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import { cn } from "@/lib/utils";
import { hasFeature, planList, requiredPlanFor } from "@/lib/plans";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

/** Ürünler ekranı yan kartı: toplu yükleme özeti + paket kilidi bilgisi. */
export function BulkUploadCard({ onOpen }: { onOpen: () => void }) {
  const { planKey } = useSellerWorkspace();
  const allowed = hasFeature(planKey, "csvImport");
  const required = requiredPlanFor("csvImport");
  return (
    <Panel aria-label="Toplu ürün yükleme">
      <PanelHeader title="Toplu Ürün Yükleme" subtitle="Excel veya CSV ile yüzlerce ürünü kolayca ekle." />
      <ul className="mb-3 space-y-1.5 text-xs text-navy-600">
        {["Ürün bilgilerini toplu aktar", "Stok ve fiyat güncelle", "Varyantları birlikte yükle"].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check size={13} aria-hidden className="shrink-0 text-emerald-500" /> {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/30 px-3 py-5 text-center hover:bg-royal-50/60 focus-visible:outline-2 focus-visible:outline-royal-500"
      >
        {allowed ? <UploadCloud size={24} aria-hidden className="text-royal-500" /> : <Lock size={22} aria-hidden className="text-amber-500" />}
        <span className="text-xs text-navy-700">{allowed ? "CSV dosyanı yüklemek için tıkla" : "Toplu yükleme bu pakette kilitli"}</span>
        <span className="text-[11px] text-muted">CSV (Maks. 10 MB)</span>
      </button>
      {!allowed ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] leading-snug text-amber-900">Bu özellik {required.name} ve üzeri paketlerde kullanılabilir.</p>
      ) : null}
    </Panel>
  );
}

const enterpriseNote: Record<string, string> = {
  "vitrin-pro-plus": "Gelişmiş toplu işlemler",
  "vitrin-enterprise": "API / ERP entegrasyonu",
};

/** Paketlere göre toplu yükleme ve ürün limiti özeti (merkezi paket yapılandırmasından okunur). */
export function PlanFeaturesCard() {
  const { planKey } = useSellerWorkspace();
  return (
    <Panel aria-label="Paketine özel özellikler">
      <PanelHeader
        title={
          <span className="flex items-center gap-1.5">
            <Crown size={16} aria-hidden className="text-royal-500" /> Paketine Özel Özellikler
          </span>
        }
      />
      <ul className="space-y-2.5">
        {planList.map((plan) => {
          const bulk = hasFeature(plan.key, "bulkProductUpload");
          return (
            <li key={plan.key} className={cn("rounded-xl border px-3 py-2.5 text-xs", plan.key === planKey ? "border-royal-300 bg-royal-50/60" : "border-line")}>
              <p className="flex items-center justify-between font-bold text-navy-900">
                {plan.name}
                {plan.key === planKey ? <span className="rounded-full bg-royal-600 px-2 py-0.5 text-[10px] font-bold text-white">Paketin</span> : null}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-navy-600">
                Toplu ürün yükleme: {bulk ? <Check size={13} aria-label="Var" className="text-emerald-500" /> : <X size={13} aria-label="Yok" className="text-rose-500" />}
                {enterpriseNote[plan.key] ? <span className="text-muted">· {enterpriseNote[plan.key]}</span> : null}
              </p>
              <p className="text-navy-600">Ürün limiti: {plan.productLimitLabel}</p>
            </li>
          );
        })}
      </ul>
      <Link href={sellerHref.plan} className={cn(linkButtonClass("primary"), "mt-3 w-full")}>
        Paketini Yükselt
      </Link>
    </Panel>
  );
}

/** Koyu Vitrin AI çağrı kartı (referans 19 sağ alt). */
export function AiPromoBanner() {
  const { ai } = useSellerWorkspace();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-sidebar via-royal-900 to-royal-700 p-4 text-white shadow-royal">
      <p className="flex items-center gap-2 text-[14px] font-bold">
        <Sparkles size={15} aria-hidden className="text-royal-200" /> Vitrin AI
        <span className="rounded-md bg-royal-500 px-1.5 py-0.5 text-[10px] font-bold">Yeni</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-royal-100">Ürünlerini analiz et, optimize et, daha fazla satış yap.</p>
      <ActionButton variant="secondary" size="sm" className="mt-3 !border-white !bg-white !text-royal-700 hover:!bg-royal-50" onClick={() => ai.openAi("En çok kazandıran 5 ürünüm hangisi?")}>
        Şimdi Sor
      </ActionButton>
    </div>
  );
}
