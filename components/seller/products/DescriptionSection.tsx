"use client";

import { Bold, Italic, List, ListOrdered, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Field } from "@/components/dashboard/form";
import { ConfirmModal } from "@/components/dashboard/Modal";
import { useToast } from "@/components/dashboard/Toast";
import { cn } from "@/lib/utils";
import { generateDescription, type ProductFormState } from "@/lib/product-form";
import { FormSection } from "@/components/seller/products/FormSection";

const toolButton = "flex h-8 w-8 items-center justify-center rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-royal-500";

/** Ürün Detayları: düz metin editörü (kalın/italik/liste işaretleri) + demo açıklama üretici. */
export function DescriptionSection({ form, onChange }: { form: ProductFormState; onChange: (value: string) => void }) {
  const toast = useToast();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const value = form.description;

  function fill() {
    onChange(generateDescription(form));
    setConfirmOpen(false);
    toast.info("Demo taslak metni eklendi. Ürününe göre düzenle.");
  }

  function apply(transform: (selected: string, start: number, end: number) => { text: string; selectFrom: number; selectTo: number }) {
    const area = ref.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const result = transform(value.slice(start, end), start, end);
    onChange(value.slice(0, start) + result.text + value.slice(end));
    window.setTimeout(() => {
      area.focus();
      area.setSelectionRange(result.selectFrom, result.selectTo);
    }, 0);
  }

  // Aşağıdaki iki fonksiyon yalnızca tıklama (event handler) içinden çağrılır; render sırasında ref'e dokunmaz.
  function wrapSelection(mark: string) {
    apply((selected, start) => {
      const inner = selected || "metin";
      return { text: `${mark}${inner}${mark}`, selectFrom: start + mark.length, selectTo: start + mark.length + inner.length };
    });
  }

  function prefixSelectedLines(prefix: (index: number) => string) {
    apply((selected, start) => {
      const lines = (selected || "madde").split("\n");
      const text = lines.map((line, index) => `${prefix(index)}${line}`).join("\n");
      return { text, selectFrom: start, selectTo: start + text.length };
    });
  }

  return (
    <FormSection title="Ürün Detayları">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="p-description" className="text-xs font-semibold text-navy-600">
          Detaylı Açıklama
        </label>
        <button
          type="button"
          onClick={() => (value.trim() ? setConfirmOpen(true) : fill())}
          className="inline-flex items-center gap-1.5 rounded-lg bg-royal-50 px-3 py-1.5 text-xs font-bold text-royal-700 hover:bg-royal-100 focus-visible:outline-2 focus-visible:outline-royal-500"
        >
          <Sparkles size={13} aria-hidden /> AI ile Açıklama Oluştur <span className="font-medium text-royal-500">(Demo)</span>
        </button>
      </div>
      <Field label={<span className="sr-only">Detaylı açıklama</span>} htmlFor="p-description">
        <div className="overflow-hidden rounded-lg border border-line focus-within:border-royal-400 focus-within:outline-2 focus-within:outline-royal-200">
          <div role="toolbar" aria-label="Metin biçimlendirme" className="flex items-center gap-0.5 border-b border-line bg-navy-50/50 px-1.5 py-1">
            <button type="button" className={toolButton} aria-label="Kalın" onClick={() => wrapSelection("**")}>
              <Bold size={15} aria-hidden />
            </button>
            <button type="button" className={toolButton} aria-label="İtalik" onClick={() => wrapSelection("_")}>
              <Italic size={15} aria-hidden />
            </button>
            <span aria-hidden className="mx-1 h-5 w-px bg-line" />
            <button type="button" className={toolButton} aria-label="Madde işaretli liste" onClick={() => prefixSelectedLines(() => "- ")}>
              <List size={15} aria-hidden />
            </button>
            <button type="button" className={toolButton} aria-label="Numaralı liste" onClick={() => prefixSelectedLines((index) => `${index + 1}. `)}>
              <ListOrdered size={15} aria-hidden />
            </button>
          </div>
          <textarea
            id="p-description"
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={9}
            placeholder="Ürünün özelliklerini, kullanım alanlarını ve kutu içeriğini yaz."
            className={cn("block min-h-40 w-full resize-y bg-white px-3 py-2.5 text-[13px] leading-relaxed text-navy-800 outline-none placeholder:text-navy-300")}
          />
        </div>
      </Field>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={fill}
        tone="primary"
        title="Açıklamanın yerine örnek metin yazılsın mı?"
        description="Mevcut açıklaman demo taslak metniyle değiştirilir."
        confirmLabel="Metni Değiştir"
      />
    </FormSection>
  );
}
