"use client";

import Link from "next/link";
import { ExternalLink, Minus, Plus, Settings2, Sparkles, TriangleAlert, Truck } from "lucide-react";
import { useId, useState } from "react";
import { DetailDrawer } from "@/components/dashboard/DetailDrawer";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { ActionButton, TextInput } from "@/components/dashboard/form";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { MovementList } from "@/components/seller/stock/MovementList";
import { sellerHref } from "@/components/seller/seller-nav";
import { cn } from "@/lib/utils";
import { formatInteger } from "@/lib/format";
import { formatDaysLeft, stockStatusLabels, type StockRow } from "@/lib/seller-analytics";
import type { StockMovement } from "@/lib/seller-ops";
import { parseCount, type AdjustMode, type StockChange } from "@/lib/seller-stock";

type Tab = "bilgi" | "varyant" | "hareket";

const AI_PROMPT = "7 gün içinde bitebilecek ürünleri göster";

function Box({ label, value, note, tone }: { label: string; value: number; note?: string; tone?: "danger" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={cn("mt-1 text-[22px] font-extrabold leading-none tabular-nums", tone === "danger" ? "text-rose-600" : tone === "success" ? "text-emerald-600" : "text-navy-900")}>{formatInteger(value)}</p>
      {note ? <p className="mt-1 text-[10.5px] leading-tight text-muted">{note}</p> : null}
    </div>
  );
}

function StockDrawerContent({
  row,
  movements,
  onClose,
  onSave,
  onAdjust,
  onOpenAi,
}: {
  row: StockRow;
  movements: StockMovement[];
  onClose: () => void;
  onSave: (changes: StockChange[]) => boolean;
  onAdjust: (mode: AdjustMode, row: StockRow) => void;
  onOpenAi: (prompt: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("bilgi");
  const [thresholdText, setThresholdText] = useState<string | undefined>(undefined);
  const thresholdId = useId();
  const product = row.product;

  const shownThreshold = thresholdText ?? String(row.threshold);
  const parsedThreshold = parseCount(shownThreshold);
  const thresholdInvalid = parsedThreshold === null;
  const thresholdDirty = thresholdText !== undefined && parsedThreshold !== null && parsedThreshold !== row.threshold;

  const stateLabel = product.status === "pasif" ? "Pasif" : product.status === "taslak" ? "Taslak" : "Aktif";
  const variants = product.variants ?? [];
  const days = row.daysLeft === null ? null : Math.max(1, Math.floor(row.daysLeft));

  function saveThreshold() {
    if (parsedThreshold === null) return;
    if (onSave([{ product, stock: product.stock, threshold: parsedThreshold, previousStock: product.stock }])) setThresholdText(undefined);
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      label={`${product.name} stok detayı`}
      header={
        <div className="flex items-start gap-3">
          <ProductThumb name={product.name} image={product.images?.[0]} size={64} className="rounded-xl" />
          <div className="min-w-0">
            <p className="text-[16px] font-extrabold leading-snug text-navy-900">{product.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={product.status === "pasif" ? "neutral" : product.status === "taslak" ? "brand" : "success"}>{stateLabel}</StatusBadge>
              <StatusBadge tone={row.status === "out" ? "danger" : row.status === "critical" ? "warning" : "neutral"} dot={false}>
                {stockStatusLabels[row.status]}
              </StatusBadge>
            </div>
            <p className="mt-1 truncate text-xs text-muted">SKU: {product.sku || "—"}</p>
            <Link href={`${sellerHref.products}/${encodeURIComponent(product.id)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-royal-500">
              <ExternalLink size={12} aria-hidden /> Ürünü Görüntüle
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Tabs
          variant="underline"
          label="Stok bölümleri"
          value={tab}
          onChange={setTab}
          items={[
            { key: "bilgi", label: "Stok Bilgisi" },
            { key: "varyant", label: "Varyantlar" },
            { key: "hareket", label: "Stok Hareketleri" },
          ]}
        />

        {tab === "bilgi" ? (
          <>
            <section aria-label="Stok özeti">
              <h3 className="mb-2 text-[13px] font-extrabold text-navy-900">Stok Özeti</h3>
              <div className="grid grid-cols-3 gap-2">
                <Box label="Mevcut Stok" value={row.onHand} note="Depodaki adet" />
                <Box label="Rezerve Stok" value={row.reserved} note="Bekleyen siparişler" tone={row.reserved > 0 ? "danger" : undefined} />
                <Box label="Satılabilir Stok" value={row.sellable} tone={row.sellable > 0 ? "success" : "danger"} />
              </div>
            </section>

            <section aria-label="Kritik stok seviyesi">
              <label htmlFor={thresholdId} className="mb-2 block text-[13px] font-extrabold text-navy-900">
                Kritik Stok Seviyesi
              </label>
              <div className="flex gap-2">
                <TextInput
                  id={thresholdId}
                  inputMode="numeric"
                  value={shownThreshold}
                  invalid={thresholdInvalid}
                  onChange={(event) => setThresholdText(event.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && thresholdDirty) saveThreshold();
                  }}
                />
                <ActionButton variant="primary" disabled={!thresholdDirty} onClick={saveThreshold}>
                  Kaydet
                </ActionButton>
              </div>
              {thresholdInvalid ? (
                <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600">
                  0 veya daha büyük bir tam sayı gir.
                </p>
              ) : null}
            </section>

            {row.status === "out" ? (
              <p role="note" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800">
                <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" /> Bu ürün stokta yok; müşteriler satın alamıyor. Stok girişi yaparak satışa yeniden açabilirsin.
              </p>
            ) : row.fast && days !== null ? (
              <p role="note" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" /> Bu ürününüz, mevcut satış hızına göre yaklaşık {days} gün içinde tükenebilir.
              </p>
            ) : row.status === "critical" ? (
              <p role="note" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" /> Stok, kritik seviye olan {row.threshold} adedin altında ya da eşit. Stok girişi yapmanı öneririz.
              </p>
            ) : row.slow || row.status === "excess" ? (
              <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
                Satış hızı düşük görünüyor; stok uzun süre yetecek. Kampanya ile hareketlendirmeyi düşünebilirsin.
              </p>
            ) : null}

            <section aria-label="Hızlı işlemler">
              <h3 className="mb-2 text-[13px] font-extrabold text-navy-900">Hızlı İşlemler</h3>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton variant="secondary" className="!border-royal-300 !text-royal-700" onClick={() => onAdjust("add", row)}>
                  <Plus size={14} aria-hidden /> Stok Ekle
                </ActionButton>
                <ActionButton variant="danger" onClick={() => onAdjust("remove", row)}>
                  <Minus size={14} aria-hidden /> Stok Düş
                </ActionButton>
                <ActionButton variant="secondary" className="!text-royal-700" onClick={() => onAdjust("threshold", row)}>
                  <Settings2 size={14} aria-hidden /> Kritik Seviye Belirle
                </ActionButton>
                <ActionButton variant="secondary" disabled title="Demo sürümünde tek depo vardır">
                  <Truck size={14} aria-hidden /> Stok Transferi
                  <span className="rounded bg-navy-100 px-1 text-[9px] font-bold uppercase text-navy-500">Yakında</span>
                </ActionButton>
              </div>
            </section>

            <section aria-label="Son stok hareketleri">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold text-navy-900">Son Stok Hareketleri</h3>
                <button type="button" onClick={() => setTab("hareket")} className="text-xs font-semibold text-royal-600 hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-royal-500">
                  Tümü →
                </button>
              </div>
              <MovementList movements={movements} limit={5} />
            </section>

            {days !== null && row.sellable > 0 ? (
              <section aria-label="Satış tahmini" className="rounded-2xl bg-royal-50 p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-royal-100 text-royal-600">
                    <Sparkles size={17} />
                  </span>
                  <div>
                    <h3 className="text-[13px] font-extrabold text-navy-900">Satış Tahmini</h3>
                    <p className="mt-1 text-xs leading-relaxed text-navy-600">
                      Mevcut satış hızına göre bu ürünün stoğu yaklaşık <strong>{formatDaysLeft(row)}</strong> içinde bitebilir. (Son 30 gündeki {formatInteger(row.sold30)} adet satışa göre.)
                    </p>
                  </div>
                </div>
                <ActionButton variant="primary" className="mt-3 w-full" onClick={() => onOpenAi(AI_PROMPT)}>
                  Stok Artırma Önerileri Gör
                </ActionButton>
              </section>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-muted">Son 30 günde bu üründen satış olmadığı için tükenme tahmini yapılamıyor.</p>
            )}
          </>
        ) : null}

        {tab === "varyant" ? (
          <section aria-label="Varyantlar">
            {variants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-navy-50/50 px-3 py-4 text-center text-xs text-muted">Bu ürünün varyantı yok. Varyant eklemek için ürünü düzenle.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {variants.map((variant) => (
                  <li key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                    <span className="font-semibold text-navy-800">{variant.label}</span>
                    <span className="text-xs text-muted">{variant.sku || "SKU yok"}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">Stok bu demoda ürün düzeyinde tutulur; varyant bazlı stok takibi sonraki aşamada eklenecek.</p>
          </section>
        ) : null}

        {tab === "hareket" ? (
          <section aria-label="Stok hareketleri">
            <MovementList movements={movements} emptyText="Bu ürün için stok hareketi yok." />
          </section>
        ) : null}
      </div>
    </DetailDrawer>
  );
}

/** Sağ stok çekmecesi (referans 24). Ürün değişince içerik sıfırlanır. */
export function StockDrawer(props: {
  row: StockRow | null;
  movements: StockMovement[];
  onClose: () => void;
  onSave: (changes: StockChange[]) => boolean;
  onAdjust: (mode: AdjustMode, row: StockRow) => void;
  onOpenAi: (prompt: string) => void;
}) {
  const { row, ...rest } = props;
  if (!row) return null;
  return <StockDrawerContent key={row.product.id} row={row} {...rest} />;
}
