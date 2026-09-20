"use client";

import { Calculator, Eye, MousePointerClick, Rocket, Target, Wallet } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { MetricCard } from "@/components/dashboard/StatCard";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { ActionButton, Field, TextInput } from "@/components/dashboard/form";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { adPriceFor, adProducts, formatAdPrice, type AdProduct } from "@/lib/ad-pricing";
import { formatTL } from "@/lib/format";
import { hasFeature } from "@/lib/plans";

function EstimateModal({ product, onClose }: { product: AdProduct; onClose: () => void }) {
  const { planKey } = useSellerWorkspace();
  const [days, setDays] = useState("7");
  const id = useId();
  const price = adPriceFor(product, planKey);
  const count = Number(days);
  const valid = Number.isInteger(count) && count >= 1 && count <= 90;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`${product.name} · Maliyet Hesapla`}
      description="Tahmini maliyeti hesaplar. Reklam yayını ve ödemesi bu demoda bağlı değildir."
      footer={
        <ActionButton variant="secondary" onClick={onClose}>
          Kapat
        </ActionButton>
      }
    >
      <div className="space-y-4">
        <Field label="Kaç gün yayında kalsın?" htmlFor={id} hint="1 ile 90 gün arası." error={!valid ? "1 ile 90 arasında bir tam sayı gir." : undefined}>
          <TextInput id={id} inputMode="numeric" value={days} invalid={!valid} onChange={(event) => setDays(event.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <div className="rounded-xl bg-royal-50 p-4 text-[13px] text-navy-700">
          {price.custom ? (
            <p>Enterprise pakette reklam fiyatları özel olarak belirlenir. Teklif için paket sayfasından talep bırakabilirsin.</p>
          ) : (
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt>Günlük başlangıç fiyatı</dt>
                <dd className="font-semibold tabular-nums">{formatTL(price.base)}</dd>
              </div>
              {price.discountPercent > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt>Paket avantajı</dt>
                  <dd className="font-semibold tabular-nums text-emerald-600">%{price.discountPercent} indirim → {formatTL(price.final)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-royal-100 pt-2 text-[14px] font-extrabold text-navy-900">
                <dt>Tahmini toplam</dt>
                <dd className="tabular-nums">{valid ? `${formatTL(price.final * count)}` : "—"}</dd>
              </div>
            </dl>
          )}
        </div>
        <p className="text-[11.5px] leading-relaxed text-muted">Fiyatlar günlük başlangıç fiyatıdır; yerleşim ve rekabete göre değişebilir.</p>
      </div>
    </Modal>
  );
}

/** Reklam Ver: reklam ürünleri ve paket avantajlı başlangıç fiyatları (merkezi `lib/ad-pricing.ts`). Performans verisi uydurulmaz. */
export function AdsPage() {
  const { plan, planKey } = useSellerWorkspace();
  const [selected, setSelected] = useState<AdProduct | null>(null);
  const toolsOpen = hasFeature(planKey, "adTools");

  return (
    <>
      <PageHeader title="Reklam Ver" description="Ürünlerini VitrinPlus içinde öne çıkar ve daha fazla alıcıya ulaş." />
      <div className="flex flex-col gap-5">
        {!toolsOpen ? <UpgradeLock variant="inline" feature="adTools" currentPlan={planKey} description="Reklam fiyatlarını inceleyebilirsin; reklam araçları Vitrin Plus ile açılır." /> : null}

        <Panel aria-label="Reklam performansı">
          <PanelHeader title="Reklam Performansı" subtitle="Aktif reklamın olduğunda gerçek gösterim, tıklama ve harcama burada listelenir." />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Gösterim" value="—" note="Veri yok" />
            <MetricCard label="Tıklama" value="—" note="Veri yok" />
            <MetricCard label="Harcama" value="—" note="Veri yok" />
            <MetricCard label="Dönüşüm" value="—" note="Veri yok" />
          </div>
          <EmptyState compact icon={Rocket} title="Henüz aktif reklamın yok" description="Reklam yayını sonraki aşamada bağlanacak; şimdilik aşağıdan fiyatları ve tahmini maliyeti inceleyebilirsin." />
        </Panel>

        <section aria-label="Reklam ürünleri">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-[15px] font-bold text-navy-900">Reklam Ürünleri</h2>
            <p className="text-xs font-semibold text-royal-700">{plan.name}: {plan.adAdvantageLabel}</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adProducts.map((product, index) => {
              const price = adPriceFor(product, planKey);
              const Icon = [Target, MousePointerClick, Eye, Wallet, Rocket][index % 5];
              return (
                <li key={product.key}>
                  <Panel className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                        <Icon size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-extrabold text-navy-900">{product.name}</h3>
                        <p className="text-xs text-muted">{product.placement}</p>
                      </div>
                    </div>
                    <p className="flex-1 text-[12.5px] leading-relaxed text-navy-600">{product.description}</p>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[18px] font-extrabold tabular-nums text-navy-900">{formatAdPrice(price)}</p>
                        {!price.custom && price.discountPercent > 0 ? <p className="text-[11px] text-muted">Standart {formatTL(price.base)}/gün · %{price.discountPercent} paket avantajı</p> : null}
                      </div>
                      <ActionButton size="sm" variant="secondary" className="!border-royal-300 !text-royal-700" onClick={() => setSelected(product)}>
                        <Calculator size={13} aria-hidden /> Maliyet Hesapla
                      </ActionButton>
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {selected ? <EstimateModal product={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
