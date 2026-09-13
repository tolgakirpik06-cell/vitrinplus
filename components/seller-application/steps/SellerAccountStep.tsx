"use client";

import type { Dispatch, SetStateAction } from "react";
import { StepShell } from "@/components/seller-application/StepShell";
import { TextField } from "@/components/seller-application/fields";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerAccountStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const { account } = data;

  function update<K extends keyof typeof account>(key: K, value: (typeof account)[K]) {
    setData((prev) => ({ ...prev, account: { ...prev.account, [key]: value } }));
  }

  return (
    <StepShell
      title="Hesap / Yetkili Bilgileri"
      subtitle="Başvuruyu yapan yetkili kişinin bilgilerini girin. Bu bilgiler mağaza yöneticiniz olarak kaydedilir."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="ad"
          label="Ad"
          required
          value={account.ad}
          error={errors.ad}
          onChange={(e) => update("ad", e.target.value)}
          placeholder="Adınız"
        />
        <TextField
          id="soyad"
          label="Soyad"
          required
          value={account.soyad}
          error={errors.soyad}
          onChange={(e) => update("soyad", e.target.value)}
          placeholder="Soyadınız"
        />
        <TextField
          id="email"
          label="E-posta"
          type="email"
          required
          value={account.email}
          error={errors.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="ornek@sirket.com"
        />
        <TextField
          id="telefon"
          label="Telefon"
          type="tel"
          required
          value={account.telefon}
          error={errors.telefon}
          onChange={(e) => update("telefon", e.target.value)}
          placeholder="05xx xxx xx xx"
          hint="Doğrulama altyapısı hazır olduğunda bu numaraya SMS ile kod gönderilecek."
        />
        <TextField
          id="tcKimlikNo"
          label="T.C. Kimlik No"
          required
          inputMode="numeric"
          maxLength={11}
          value={account.tcKimlikNo}
          error={errors.tcKimlikNo}
          onChange={(e) => update("tcKimlikNo", e.target.value.replace(/\D/g, ""))}
          placeholder="11 haneli kimlik numaranız"
        />
        <TextField
          id="dogumTarihi"
          label="Doğum Tarihi"
          type="date"
          value={account.dogumTarihi}
          onChange={(e) => update("dogumTarihi", e.target.value)}
        />
        <TextField
          id="sifre"
          label="Şifre"
          type="password"
          required
          value={account.sifre}
          error={errors.sifre}
          onChange={(e) => update("sifre", e.target.value)}
          placeholder="En az 8 karakter"
        />
        <TextField
          id="sifreTekrar"
          label="Şifre Tekrar"
          type="password"
          required
          value={account.sifreTekrar}
          error={errors.sifreTekrar}
          onChange={(e) => update("sifreTekrar", e.target.value)}
          placeholder="Şifrenizi tekrar girin"
        />
      </div>

      <p className="rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs leading-relaxed text-navy-500">
        E-posta ve telefon doğrulaması şu an aktif değildir; bu ekran gerçek bir
        SMS/e-posta doğrulama altyapısıyla çalışacak şekilde hazırlanmıştır.
        Bilgileriniz &quot;doğrulanmadı&quot; olarak kaydedilecektir.
      </p>
    </StepShell>
  );
}
