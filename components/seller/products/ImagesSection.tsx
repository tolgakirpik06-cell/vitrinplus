"use client";

import { Camera, ImageIcon, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/dashboard/Toast";
import { useMarketplace } from "@/components/marketplace/context";
import { DEMO_RESIZE, STORE_RESIZE, resizeImageFile } from "@/lib/image-resize";
import { MAX_IMAGES } from "@/lib/product-form";
import { FormSection } from "@/components/seller/products/FormSection";

/**
 * Ürün görselleri. Görseller küçültülerek demo depolamasına kaydedilir; bu yüzden
 * ürün başına en fazla MAX_IMAGES görsel eklenebilir. Görsel zorunlu değildir.
 */
export function ImagesSection({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const toast = useToast();
  const live = useMarketplace().mode === "supabase";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.info(`En fazla ${MAX_IMAGES} görsel ekleyebilirsin.`);
      return;
    }
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        added.push(await resizeImageFile(file, live ? STORE_RESIZE : DEMO_RESIZE));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Görsel eklenemedi.");
      }
    }
    if (files.length > room) toast.info(`Yalnızca ${room} görsel eklendi (sınır ${MAX_IMAGES}).`);
    if (added.length) onChange([...images, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <FormSection title="Ürün Görselleri" description="Görsel eklemezsen vitrinde standart görsel kullanılır.">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((source, index) => (
          <li key={`${index}-${source.length}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-navy-50">
            {/* Veri URL'si olduğu için next/image yerine düz img kullanılır. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={source} alt={`Ürün görseli ${index + 1}`} className="h-full w-full object-cover" />
            {index === 0 ? <span className="absolute left-1.5 top-1.5 rounded-md bg-royal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Ana Görsel</span> : null}
            <button
              type="button"
              aria-label={`${index + 1}. görseli kaldır`}
              onClick={() => onChange(images.filter((_, position) => position !== index))}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-navy-500 shadow hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-royal-500"
            >
              <X size={13} aria-hidden />
            </button>
            {index !== 0 ? (
              <button
                type="button"
                onClick={() => onChange([source, ...images.filter((_, position) => position !== index)])}
                className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-md bg-white/95 py-1 text-[10px] font-bold text-royal-700 opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Star size={11} aria-hidden /> Ana Yap
              </button>
            ) : null}
          </li>
        ))}
        {images.length < MAX_IMAGES ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/40 text-royal-600 transition-colors hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-royal-500 disabled:opacity-60"
            >
              {busy ? <ImageIcon size={22} aria-hidden className="animate-pulse" /> : <Camera size={22} aria-hidden />}
              <span className="text-xs font-semibold">{busy ? "Yükleniyor…" : "Görsel Ekle"}</span>
              <span className="text-[10px] text-muted">(Maks. {MAX_IMAGES} adet)</span>
            </button>
          </li>
        ) : null}
      </ul>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => void addFiles(event.target.files)} aria-label="Ürün görseli seç" />
    </FormSection>
  );
}
