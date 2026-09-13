"use client";

import type { Dispatch, SetStateAction } from "react";
import { StepShell } from "@/components/seller-application/StepShell";
import { TextField } from "@/components/seller-application/fields";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerBusinessStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const { business, sellerType } = data;

  function update<K extends keyof typeof business>(key: K, value: (typeof business)[K]) {
    setData((prev) => ({ ...prev, business: { ...prev.business, [key]: value } }));
  }

  if (sellerType === "bireysel") {
    return (
      <StepShell
        title="İşletme Bilgileri"
        subtitle="Bireysel satıcı olarak sadece adres bilgilerinizi paylaşmanız yeterli."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="isletmeAdresi"
            label="Adres"
            required
            className="sm:col-span-2"
            value={business.isletmeAdresi}
            error={errors.isletmeAdresi}
            onChange={(e) => update("isletmeAdresi", e.target.value)}
            placeholder="Mahalle, cadde, sokak, no"
          />
          <TextField
            id="il"
            label="İl"
            required
            value={business.il}
            error={errors.il}
            onChange={(e) => update("il", e.target.value)}
            placeholder="Örn. İstanbul"
          />
          <TextField
            id="ilce"
            label="İlçe"
            required
            value={business.ilce}
            error={errors.ilce}
            onChange={(e) => update("ilce", e.target.value)}
            placeholder="Örn. Kadıköy"
          />
        </div>
      </StepShell>
    );
  }

  if (sellerType === "sahis") {
    return (
      <StepShell
        title="İşletme Bilgileri"
        subtitle="Şahıs işletmenize ait vergi ve adres bilgilerini girin."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="ticariUnvan"
            label="Ticari Unvan"
            required
            className="sm:col-span-2"
            value={business.ticariUnvan}
            error={errors.ticariUnvan}
            onChange={(e) => update("ticariUnvan", e.target.value)}
            placeholder="İşletmenizin ticari unvanı"
          />
          <TextField
            id="vergiDairesi"
            label="Vergi Dairesi"
            required
            value={business.vergiDairesi}
            error={errors.vergiDairesi}
            onChange={(e) => update("vergiDairesi", e.target.value)}
          />
          <TextField
            id="vergiNumarasi"
            label="Vergi Numarası / TCKN"
            required
            inputMode="numeric"
            value={business.vergiNumarasi}
            error={errors.vergiNumarasi}
            onChange={(e) => update("vergiNumarasi", e.target.value.replace(/\D/g, ""))}
          />
          <TextField
            id="isletmeAdresi"
            label="İşletme Adresi"
            required
            className="sm:col-span-2"
            value={business.isletmeAdresi}
            error={errors.isletmeAdresi}
            onChange={(e) => update("isletmeAdresi", e.target.value)}
            placeholder="Mahalle, cadde, sokak, no"
          />
          <TextField
            id="il"
            label="İl"
            required
            value={business.il}
            error={errors.il}
            onChange={(e) => update("il", e.target.value)}
          />
          <TextField
            id="ilce"
            label="İlçe"
            required
            value={business.ilce}
            error={errors.ilce}
            onChange={(e) => update("ilce", e.target.value)}
          />
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Şirket Bilgileri"
      subtitle="Limited veya anonim şirketinize ait resmi bilgileri girin."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="sirketUnvani"
          label="Şirket Unvanı"
          required
          className="sm:col-span-2"
          value={business.sirketUnvani}
          error={errors.sirketUnvani}
          onChange={(e) => update("sirketUnvani", e.target.value)}
          placeholder="Örn. Örnek Ticaret A.Ş."
        />
        <TextField
          id="vergiNumarasi"
          label="Vergi Numarası"
          required
          inputMode="numeric"
          value={business.vergiNumarasi}
          error={errors.vergiNumarasi}
          onChange={(e) => update("vergiNumarasi", e.target.value.replace(/\D/g, ""))}
        />
        <TextField
          id="vergiDairesi"
          label="Vergi Dairesi"
          required
          value={business.vergiDairesi}
          error={errors.vergiDairesi}
          onChange={(e) => update("vergiDairesi", e.target.value)}
        />
        <TextField
          id="mersisNumarasi"
          label="MERSİS Numarası"
          required
          value={business.mersisNumarasi}
          error={errors.mersisNumarasi}
          onChange={(e) => update("mersisNumarasi", e.target.value)}
        />
        <TextField
          id="ticaretSicilNumarasi"
          label="Ticaret Sicil Numarası"
          required
          value={business.ticaretSicilNumarasi}
          error={errors.ticaretSicilNumarasi}
          onChange={(e) => update("ticaretSicilNumarasi", e.target.value)}
        />
        <TextField
          id="yetkiliKisi"
          label="Yetkili Kişi"
          required
          className="sm:col-span-2"
          value={business.yetkiliKisi}
          error={errors.yetkiliKisi}
          onChange={(e) => update("yetkiliKisi", e.target.value)}
          placeholder="Şirketi temsile yetkili kişinin adı soyadı"
        />
        <TextField
          id="sirketAdresi"
          label="Şirket Adresi"
          required
          className="sm:col-span-2"
          value={business.sirketAdresi}
          error={errors.sirketAdresi}
          onChange={(e) => update("sirketAdresi", e.target.value)}
          placeholder="Mahalle, cadde, sokak, no"
        />
        <TextField
          id="il"
          label="İl"
          required
          value={business.il}
          error={errors.il}
          onChange={(e) => update("il", e.target.value)}
        />
        <TextField
          id="ilce"
          label="İlçe"
          required
          value={business.ilce}
          error={errors.ilce}
          onChange={(e) => update("ilce", e.target.value)}
        />
      </div>
    </StepShell>
  );
}
