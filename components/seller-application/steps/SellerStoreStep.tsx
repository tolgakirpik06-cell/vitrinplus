"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { StepShell } from "@/components/seller-application/StepShell";
import { TextField, TextareaField, CheckboxRow } from "@/components/seller-application/fields";
import { FileDropzone } from "@/components/seller-application/FileDropzone";
import { mainCategories } from "@/data/categories";
import { slugifyStoreName } from "@/lib/seller-application";
import { cn } from "@/lib/utils";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerStoreStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const { store, shipping } = data;
  const [slugTouched, setSlugTouched] = useState(store.magazaSlug !== slugifyStoreName(store.magazaAdi));

  function updateStore<K extends keyof typeof store>(key: K, value: (typeof store)[K]) {
    setData((prev) => ({ ...prev, store: { ...prev.store, [key]: value } }));
  }

  function updateShipping<K extends keyof typeof shipping>(key: K, value: (typeof shipping)[K]) {
    setData((prev) => ({ ...prev, shipping: { ...prev.shipping, [key]: value } }));
  }

  function toggleCategory(name: string) {
    setData((prev) => {
      const has = prev.store.anaKategoriler.includes(name);
      return {
        ...prev,
        store: {
          ...prev.store,
          anaKategoriler: has
            ? prev.store.anaKategoriler.filter((c) => c !== name)
            : [...prev.store.anaKategoriler, name],
        },
      };
    });
  }

  return (
    <StepShell
      title="Mağaza Bilgileri"
      subtitle="Müşterilerinizin göreceği mağaza profilini oluşturun."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="magazaAdi"
          label="Mağaza Adı"
          required
          value={store.magazaAdi}
          error={errors.magazaAdi}
          onChange={(e) => {
            const value = e.target.value;
            updateStore("magazaAdi", value);
            if (!slugTouched) updateStore("magazaSlug", slugifyStoreName(value));
          }}
          placeholder="Örn. TeknoCenter"
        />
        <TextField
          id="magazaSlug"
          label="Mağaza Kullanıcı Adı"
          required
          value={store.magazaSlug}
          error={errors.magazaSlug}
          onChange={(e) => {
            setSlugTouched(true);
            updateStore("magazaSlug", slugifyStoreName(e.target.value));
          }}
          hint={store.magazaSlug ? `pazarbuy.com/magaza/${store.magazaSlug}` : undefined}
        />
        <TextareaField
          id="aciklama"
          label="Mağaza Açıklaması"
          required
          className="sm:col-span-2"
          value={store.aciklama}
          error={errors.aciklama}
          onChange={(e) => updateStore("aciklama", e.target.value)}
          placeholder="Mağazanızı ve sattığınız ürünleri kısaca tanıtın"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FileDropzone
          id="logo"
          label="Mağaza Logosu"
          description="Kare formatta, en az 400x400px önerilir"
          value={store.logo}
          onChange={(meta) => updateStore("logo", meta)}
        />
        <FileDropzone
          id="kapakGorseli"
          label="Kapak Görseli"
          description="Geniş formatta, en az 1600x400px önerilir"
          value={store.kapakGorseli}
          onChange={(meta) => updateStore("kapakGorseli", meta)}
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-navy-800">
          Satış Yapılacak Ana Kategoriler<span className="ml-0.5 text-brand-500">*</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {mainCategories.map((category) => {
            const isActive = store.anaKategoriler.includes(category.name);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-navy-100 bg-white text-navy-600 hover:border-brand-300 hover:text-brand-600"
                )}
              >
                <category.icon size={13} />
                {category.name}
              </button>
            );
          })}
        </div>
        {errors.anaKategoriler ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.anaKategoriler}</p>
        ) : null}
      </div>

      <div className="border-t border-navy-100 pt-6">
        <h3 className="text-sm font-bold text-navy-900">Kargo Bilgileri</h3>
        <p className="mt-1 text-xs text-navy-400">Ürünlerinizi nereden kargolayacaksınız?</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="shippingIl"
            label="İl"
            required
            value={shipping.il}
            error={errors.shippingIl}
            onChange={(e) => updateShipping("il", e.target.value)}
          />
          <TextField
            id="shippingIlce"
            label="İlçe"
            required
            value={shipping.ilce}
            error={errors.shippingIlce}
            onChange={(e) => updateShipping("ilce", e.target.value)}
          />
          <TextareaField
            id="shippingAcikAdres"
            label="Açık Adres"
            required
            className="sm:col-span-2"
            value={shipping.acikAdres}
            error={errors.shippingAcikAdres}
            onChange={(e) => updateShipping("acikAdres", e.target.value)}
          />
        </div>

        <div className="mt-4">
          <CheckboxRow
            id="iadeAdresiAyni"
            checked={shipping.iadeAdresiAyni}
            onChange={(checked) => updateShipping("iadeAdresiAyni", checked)}
            label="İade adresim, kargo adresimle aynı."
          />
        </div>

        {!shipping.iadeAdresiAyni ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="iadeIl"
              label="İade İli"
              required
              value={shipping.iadeIl}
              error={errors.iadeIl}
              onChange={(e) => updateShipping("iadeIl", e.target.value)}
            />
            <TextField
              id="iadeIlce"
              label="İade İlçesi"
              required
              value={shipping.iadeIlce}
              error={errors.iadeIlce}
              onChange={(e) => updateShipping("iadeIlce", e.target.value)}
            />
            <TextareaField
              id="iadeAcikAdres"
              label="İade Açık Adresi"
              required
              className="sm:col-span-2"
              value={shipping.iadeAcikAdres}
              error={errors.iadeAcikAdres}
              onChange={(e) => updateShipping("iadeAcikAdres", e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </StepShell>
  );
}
