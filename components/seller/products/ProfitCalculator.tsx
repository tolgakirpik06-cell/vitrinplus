"use client";

import { Calculator, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Panel } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { ActionButton, UnitInput } from "@/components/dashboard/form";
import { cn } from "@/lib/utils";
import { COMMISSION_LABEL, COMMISSION_RATE } from "@/lib/plans";
import { formatPercent, formatTL } from "@/lib/format";
import { PAYMENT_FEE_RATE, calcProfit, fixedCost, priceForTargetMargin } from "@/lib/profit";
import { formToCosts, numberOrZero, toNumber, type ProductFormState } from "@/lib/product-form";

export type CostField = "productCost" | "shipping" | "packaging" | "payment" | "other";
type CalcMode = "price" | "target";

const modeTabs: { key: CalcMode; label: string }[] = [
  { key: "price", label: "Satış Fiyatına Göre Hesapla" },
  { key: "target", label: "Hedef Kâra Göre Hesapla" },
];

function CostRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_150px] items-center gap-3">
      <div className="text-[13px] text-navy-700">
        {label}
        {hint ? <span className="ml-1 text-[11px] text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Canlı kâr hesaplayıcı. Tüm alanlar formla paylaşılan durumdur; değişen her değer
 * sonucu anında günceller. Ürün maliyeti yalnızca satıcı içindir, müşteriye gösterilmez.
 */
export function ProfitCalculator({
  values,
  errors,
  onChange,
  onApplyPrice,
}: {
  values: Pick<ProductFormState, "price" | "productCost" | "shipping" | "packaging" | "payment" | "other">;
  errors?: Partial<Record<CostField | "price", string>>;
  onChange: (field: CostField | "price", value: string) => void;
  onApplyPrice: (price: number) => void;
}) {
  const [mode, setMode] = useState<CalcMode>("price");
  const [targetMargin, setTargetMargin] = useState("30");
  const idBase = useId();

  const costs = useMemo(() => formToCosts(values), [values]);
  const price = numberOrZero(values.price);
  const margin = toNumber(targetMargin);
  const suggested = useMemo(() => (Number.isNaN(margin) ? null : priceForTargetMargin(costs, margin, COMMISSION_RATE)), [costs, margin]);
  // "Hedef Kâra Göre" modunda sonuç kutusu, önerilen fiyat uygulanırsa elde edilecek kârı gösterir.
  const usingSuggested = mode === "target" && suggested !== null;
  const shownPrice = usingSuggested ? suggested : price;
  const result = useMemo(() => calcProfit(shownPrice, costs, COMMISSION_RATE), [shownPrice, costs]);
  const cost = fixedCost(costs);
  const hasPrice = shownPrice > 0;
  const loss = hasPrice && result.profit < 0;

  const breakdown: [string, number][] = [
    ["Ürün maliyeti", costs.productCost],
    ["Kargo maliyeti", costs.shipping],
    ["Paketleme", costs.packaging],
    ["Ödeme kesintisi", costs.payment],
    ["Diğer giderler", costs.other],
    ["VitrinPlus komisyonu", result.commission],
  ];

  return (
    <Panel aria-label="Kâr hesaplayıcı">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
            <Calculator size={21} />
          </span>
          <div>
            <h2 className="text-[16px] font-extrabold text-navy-900">Kâr Hesaplayıcı</h2>
            <p className="text-xs text-muted">Maliyetlerini gir, tahmini kârını anında gör.</p>
          </div>
        </div>
        <Tabs variant="segment" label="Hesaplama yöntemi" items={modeTabs} value={mode} onChange={setMode} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(220px,0.9fr)]">
        <div className="flex flex-col gap-3">
          <CostRow label="Ürün maliyeti" hint="(alış fiyatı)">
            <UnitInput unit="TL" min={0} step="0.01" value={values.productCost} onChange={(event) => onChange("productCost", event.target.value)} invalid={!!errors?.productCost} aria-label="Ürün maliyeti (alış fiyatı)" placeholder="0" />
          </CostRow>
          <CostRow label="Kargo maliyeti">
            <UnitInput unit="TL" min={0} step="0.01" value={values.shipping} onChange={(event) => onChange("shipping", event.target.value)} invalid={!!errors?.shipping} aria-label="Kargo maliyeti" placeholder="0" />
          </CostRow>
          <CostRow label="Paketleme maliyeti">
            <UnitInput unit="TL" min={0} step="0.01" value={values.packaging} onChange={(event) => onChange("packaging", event.target.value)} invalid={!!errors?.packaging} aria-label="Paketleme maliyeti" placeholder="0" />
          </CostRow>
          <CostRow label="Ödeme altyapısı kesintisi" hint={`(≈${formatPercent(PAYMENT_FEE_RATE * 100)})`}>
            <div className="flex flex-col gap-1">
              <UnitInput unit="TL" min={0} step="0.01" value={values.payment} onChange={(event) => onChange("payment", event.target.value)} invalid={!!errors?.payment} aria-label="Ödeme altyapısı kesintisi" placeholder="0" />
              <button
                type="button"
                disabled={price <= 0}
                onClick={() => onChange("payment", String(Math.round(price * PAYMENT_FEE_RATE * 100) / 100))}
                className="self-end text-[11px] font-semibold text-royal-600 hover:text-royal-800 disabled:cursor-not-allowed disabled:text-navy-300"
              >
                Fiyata göre otomatik hesapla
              </button>
            </div>
          </CostRow>
          <CostRow label="Diğer giderler" hint="(opsiyonel)">
            <UnitInput unit="TL" min={0} step="0.01" value={values.other} onChange={(event) => onChange("other", event.target.value)} invalid={!!errors?.other} aria-label="Diğer giderler" placeholder="0" />
          </CostRow>
          <CostRow label="VitrinPlus satış komisyonu">
            <div className="flex items-center gap-2">
              <span className="flex h-10 flex-1 items-center justify-end rounded-lg border border-line bg-navy-50/60 px-3 text-[13px] font-semibold tabular-nums text-navy-500" aria-label={`Komisyon ${formatTL(result.commission)}`}>
                {formatTL(result.commission)}
              </span>
              <StatusBadge tone="success" dot={false}>
                {COMMISSION_LABEL.replace(" satış komisyonu", " Komisyon")}
              </StatusBadge>
            </div>
          </CostRow>
          <CostRow label="Satış fiyatı">
            <UnitInput
              unit="TL"
              min={0}
              step="0.01"
              value={values.price}
              onChange={(event) => onChange("price", event.target.value)}
              invalid={!!errors?.price}
              aria-label="Satış fiyatı"
              aria-describedby={errors?.price ? `${idBase}-price-error` : undefined}
              placeholder="0"
            />
          </CostRow>
          {errors?.price ? (
            <p id={`${idBase}-price-error`} role="alert" className="text-right text-[11px] font-medium text-rose-600">
              {errors.price}
            </p>
          ) : null}
        </div>

        <div className={cn("flex flex-col rounded-xl border p-4", loss ? "border-rose-200 bg-rose-50/70" : "border-emerald-200 bg-emerald-50/70")} aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-navy-600">{usingSuggested ? "Önerilen Fiyatta Net Kâr" : "Tahmini Net Kâr"}</p>
              <p className={cn("mt-1 text-[30px] font-extrabold leading-none tracking-tight tabular-nums", loss ? "text-rose-600" : "text-emerald-600")}>{hasPrice ? formatTL(result.profit) : "—"}</p>
            </div>
            {loss ? <TrendingDown size={26} aria-hidden className="text-rose-400" /> : <TrendingUp size={26} aria-hidden className="text-emerald-400" />}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-b border-black/5 pb-3">
            <span className="text-xs font-semibold text-navy-600">Kâr Marjı</span>
            <span className={cn("text-xl font-extrabold tabular-nums", loss ? "text-rose-600" : "text-emerald-600")}>{hasPrice ? formatPercent(result.margin) : "—"}</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-navy-600">Satış fiyatı</dt>
              <dd className="font-bold tabular-nums text-navy-900">{hasPrice ? formatTL(shownPrice) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-navy-600">Toplam maliyet</dt>
              <dd className="font-bold tabular-nums text-rose-600">{formatTL(result.totalCost)}</dd>
            </div>
            {breakdown.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 pl-3 text-[11.5px] text-muted">
                <dt>– {label}</dt>
                <dd className="tabular-nums">{formatTL(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-[11.5px] leading-snug text-navy-600">
            <Lightbulb size={14} aria-hidden className="mt-0.5 shrink-0 text-amber-500" />
            {!hasPrice
              ? "Satış fiyatını girdiğinde tahmini kârını burada göreceksin."
              : loss
                ? `Bu fiyatta her üründe tahmini ${formatTL(Math.abs(result.profit))} zarar edersin. Fiyatı yükselt veya maliyeti düşür.`
                : `${usingSuggested ? "Önerilen fiyata" : "Bu fiyata"} sattığında her üründen tahmini ${formatTL(result.profit)} kâr edersin.`}
          </p>
        </div>
      </div>

      <div className={cn("mt-4 rounded-xl border-l-4 bg-royal-50/60 p-4", mode === "target" ? "border-royal-500 ring-1 ring-royal-200" : "border-royal-300")}>
        <h3 className="text-[14px] font-extrabold text-royal-800">Hedef Kâr ile Fiyat Hesapla</h3>
        <p className="mt-0.5 text-xs text-muted">İstediğin kâr marjını gir, sana önerilen satış fiyatını hesaplayalım.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
            Hedef kâr marjı
            <UnitInput unit="%" min={0} max={95} step="1" value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} aria-label="Hedef kâr marjı yüzdesi" />
          </label>
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-[11px] font-semibold text-muted">Önerilen satış fiyatı</p>
            <p className="text-[22px] font-extrabold leading-tight text-emerald-600 tabular-nums" aria-live="polite">
              {suggested === null ? "—" : formatTL(suggested)}
            </p>
          </div>
          <ActionButton
            variant="soft"
            disabled={suggested === null}
            onClick={() => {
              if (suggested !== null) onApplyPrice(suggested);
            }}
          >
            Bu Fiyatı Uygula
          </ActionButton>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {suggested === null
            ? cost <= 0
              ? "Önerilen fiyatı hesaplamak için önce maliyetlerini gir."
              : "Hedef marj %0–95 arasında olmalı."
            : `${formatTL(cost)} ÷ (1 − ${(margin / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}) = ${formatTL(cost / (1 - margin / 100 - COMMISSION_RATE))} → yukarı yuvarlanarak ${formatTL(suggested)}`}
        </p>
      </div>
    </Panel>
  );
}
