"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { ProgressBar, ProgressRing } from "@/components/dashboard/charts";
import { formatPercent } from "@/lib/format";
import { useQuestions } from "@/lib/questions";
import { computeStoreHealth } from "@/lib/seller-analytics";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

type Tone = "success" | "warning" | "danger";

function toneFor(value: number, good: number, ok: number): Tone {
  return value >= good ? "success" : value >= ok ? "warning" : "danger";
}

function lowerIsBetter(value: number, good: number, ok: number): Tone {
  return value <= good ? "success" : value <= ok ? "warning" : "danger";
}

function Metric({ label, display, value, tone }: { label: string; display: string; value: number; tone: Tone }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2 text-[13px]">
      <span className="text-navy-600">{label}</span>
      <span className="text-right font-bold tabular-nums text-navy-900">{display}</span>
      <ProgressBar value={value} tone={tone} label={label} className="col-span-2" />
    </li>
  );
}

/** Ortalama yanıt süresi (dakika); yanıtlanmış soru yoksa null. */
function averageResponseMinutes(answered: { createdAt: string; answeredAt?: string }[]): number | null {
  const durations = answered.filter((item) => item.answeredAt).map((item) => (new Date(item.answeredAt as string).getTime() - new Date(item.createdAt).getTime()) / 60_000);
  if (!durations.length) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} dk`;
  const hours = minutes / 60;
  return hours < 48 ? `${Math.round(hours)} sa` : `${Math.round(hours / 24)} gün`;
}

export function StoreHealthCard() {
  const { rows, products, now, shop, ai } = useSellerWorkspace();
  const questions = useQuestions(shop.settings.storeName);
  const health = useMemo(() => computeStoreHealth(rows, products, now, shop.shipping.preparationDays), [rows, products, now, shop.shipping.preparationDays]);
  const response = useMemo(() => averageResponseMinutes(questions.filter((item) => item.status === "yanitlandi")), [questions]);
  const scoreColor = health.score === null ? "#94a3b8" : health.score >= 90 ? "#10b981" : health.score >= 75 ? "#5560f2" : health.score >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <Panel aria-label="Mağaza sağlığı">
      <PanelHeader title="Mağaza Sağlığı" />
      {health.score === null ? (
        <EmptyState compact icon={ShieldCheck} title="Mağaza puanı henüz hesaplanamıyor" description="Sipariş aldıkça kargo, iptal ve stok başarına göre puanın burada görünür." />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <ProgressRing value={health.score} size={116} thickness={10} color={scoreColor} ariaLabel={`Mağaza puanı ${health.score} / 100, ${health.label}`}>
              <span className="text-[24px] font-extrabold leading-none text-navy-900">
                {health.score}
                <span className="text-sm font-semibold text-muted">/100</span>
              </span>
            </ProgressRing>
            <p className="text-[13px] font-bold" style={{ color: scoreColor }}>
              {health.label}
            </p>
          </div>
          <ul className="min-w-0 flex-1 divide-y divide-line/60">
            <Metric label="Kargoya verme" display={formatPercent(health.shippingRate, 0)} value={health.shippingRate} tone={toneFor(health.shippingRate, 95, 80)} />
            <Metric label="İptal oranı" display={formatPercent(health.cancelRate)} value={Math.min(100, health.cancelRate * 5)} tone={lowerIsBetter(health.cancelRate, 2, 5)} />
            <Metric label="İade oranı" display={formatPercent(health.returnRate)} value={Math.min(100, health.returnRate * 5)} tone="success" />
            <Metric label="Müşteri yanıt süresi" display={response === null ? "—" : formatMinutes(response)} value={response === null ? 0 : Math.max(0, 100 - response / 14.4)} tone={response === null ? "warning" : response <= 240 ? "success" : "warning"} />
            <Metric label="Stok doğruluğu" display={formatPercent(health.stockRate, 0)} value={health.stockRate} tone={toneFor(health.stockRate, 95, 80)} />
          </ul>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-royal-100 bg-royal-50/50 px-3.5 py-3">
        <Lightbulb size={17} aria-hidden className="shrink-0 text-amber-500" />
        <p className="min-w-0 flex-1 text-xs leading-snug text-navy-600">
          <span className="font-semibold text-navy-800">Mağazanı geliştirmek için: </span>
          stoğu biten ürünleri güncel tut ve siparişleri hazırlama süresi içinde kargola.
        </p>
        <button type="button" onClick={() => ai.openAi("Stoğu bitecek ürünleri bul")} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-royal-700 ring-1 ring-inset ring-royal-200 hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-royal-500">
          Önerileri Gör
        </button>
      </div>
      <div className="mt-3 text-right">
        <Link href={sellerHref.analytics} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
          Detaylı Analiz <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </Panel>
  );
}
