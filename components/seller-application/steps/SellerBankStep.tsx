"use client";

import type { Dispatch, SetStateAction } from "react";
import { Info } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { TextField } from "@/components/seller-application/fields";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerBankStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const { bank } = data;

  function update<K extends keyof typeof bank>(key: K, value: (typeof bank)[K]) {
    setData((prev) => ({ ...prev, bank: { ...prev.bank, [key]: value } }));
  }

  return (
    <StepShell
      title="Ödeme / IBAN Bilgileri"
      subtitle="Satış gelirleriniz bu hesaba aktarılacaktır."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="iban"
          label="IBAN"
          required
          className="sm:col-span-2"
          value={bank.iban}
          error={errors.iban}
          onChange={(e) => update("iban", e.target.value.toUpperCase().replace(/\s+/g, ""))}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          maxLength={26}
        />
        <TextField
          id="bankaAdi"
          label="Banka Adı"
          required
          value={bank.bankaAdi}
          error={errors.bankaAdi}
          onChange={(e) => update("bankaAdi", e.target.value)}
          placeholder="Örn. Ziraat Bankası"
        />
        <TextField
          id="hesapSahibiAdi"
          label="Hesap Sahibinin Adı / Unvanı"
          required
          value={bank.hesapSahibiAdi}
          error={errors.hesapSahibiAdi}
          onChange={(e) => update("hesapSahibiAdi", e.target.value)}
          placeholder="IBAN üzerindeki isimle birebir aynı olmalı"
        />
      </div>

      <p className="flex items-start gap-2.5 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs leading-relaxed text-navy-500">
        <Info size={15} className="mt-0.5 shrink-0 text-navy-400" />
        IBAN, başvuru sahibinin veya şirketin resmi bilgileriyle eşleşmelidir.
        Uyuşmayan hesap bilgileri başvurunuzun onay sürecini uzatabilir.
      </p>
    </StepShell>
  );
}
