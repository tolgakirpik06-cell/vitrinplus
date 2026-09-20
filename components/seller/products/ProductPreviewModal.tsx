"use client";

import { Package, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/dashboard/Modal";
import { ActionButton } from "@/components/dashboard/form";
import { formatTL } from "@/lib/format";
import { numberOrZero, toNumber, type ProductFormState } from "@/lib/product-form";

/**
 * Müşteri görünümü önizlemesi. Maliyet, kâr ve stok eşiği gibi satıcıya özel
 * bilgiler burada ASLA yer almaz.
 */
export function ProductPreviewModal({ open, onClose, form, storeName }: { open: boolean; onClose: () => void; form: ProductFormState; storeName: string }) {
  const price = numberOrZero(form.price);
  const sale = toNumber(form.salePrice);
  const hasSale = !Number.isNaN(sale) && sale > 0 && sale < price;
  const stock = numberOrZero(form.stock);
  const specs = [
    { label: "SKU", value: form.sku.trim() },
    { label: "Marka", value: form.brand.trim() },
    { label: "Model", value: form.model.trim() },
  ].filter((spec) => spec.value);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Ürün Önizleme"
      description="Müşterinin ürün sayfasında göreceği bilgiler. Ürün maliyetin burada gösterilmez."
      footer={
        <ActionButton variant="secondary" onClick={onClose}>
          Kapat
        </ActionButton>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="aspect-square overflow-hidden rounded-xl border border-line bg-navy-50">
          {form.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.images[0]} alt="Ürün ana görseli" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-navy-300">
              <Package size={34} aria-hidden />
              <span className="text-xs">Standart görsel</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-royal-600">{form.brand.trim() || storeName}</p>
          <h3 className="mt-1 text-lg font-extrabold leading-snug text-navy-900">{form.name.trim() || "Ürün adı"}</h3>
          <p className="mt-1 text-xs text-muted">Satıcı: {storeName}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tabular-nums text-navy-900">{price > 0 ? formatTL(hasSale ? sale : price) : "— TL"}</span>
            {hasSale ? <span className="text-sm tabular-nums text-muted line-through">{formatTL(price)}</span> : null}
          </div>
          <p className={stock > 0 ? "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600" : "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"}>
            <ShieldCheck size={13} aria-hidden /> {stock > 0 ? "Stokta var" : "Stokta yok"}
          </p>
          {form.shortDescription.trim() ? <p className="mt-3 text-[13px] leading-relaxed text-navy-700">{form.shortDescription.trim()}</p> : null}
        </div>
      </div>
      {form.description.trim() ? (
        <div className="mt-5 border-t border-line pt-4">
          <h4 className="text-[13px] font-bold text-navy-900">Ürün Açıklaması</h4>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-navy-700">{form.description.trim()}</p>
        </div>
      ) : null}
      {specs.length ? (
        <dl className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-line pt-4 text-xs sm:grid-cols-2">
          {specs.map((spec) => (
            <div key={spec.label} className="flex justify-between gap-3">
              <dt className="text-muted">{spec.label}</dt>
              <dd className="font-semibold text-navy-800">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Modal>
  );
}
