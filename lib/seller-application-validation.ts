import type { SellerApplicationData } from "@/types/seller-application";
import {
  isValidEmail,
  isValidPhone,
  isValidTaxNumber,
  isValidTcKimlik,
  isValidTrIban,
} from "@/lib/seller-application";

export type FieldErrors = Record<string, string>;

const REQUIRED = "Bu alan zorunludur.";

export function validateSellerType(data: SellerApplicationData): FieldErrors {
  return data.sellerType ? {} : { sellerType: "Devam etmek için bir satıcı tipi seçin." };
}

export function validateAccount(data: SellerApplicationData): FieldErrors {
  const { account } = data;
  const errors: FieldErrors = {};

  if (!account.ad.trim()) errors.ad = REQUIRED;
  if (!account.soyad.trim()) errors.soyad = REQUIRED;

  if (!account.email.trim()) errors.email = REQUIRED;
  else if (!isValidEmail(account.email)) errors.email = "Geçerli bir e-posta adresi girin.";

  if (!account.telefon.trim()) errors.telefon = REQUIRED;
  else if (!isValidPhone(account.telefon)) errors.telefon = "Geçerli bir telefon numarası girin.";

  if (!account.tcKimlikNo.trim()) errors.tcKimlikNo = REQUIRED;
  else if (!isValidTcKimlik(account.tcKimlikNo)) errors.tcKimlikNo = "11 haneli T.C. kimlik numarası girin.";

  if (!account.sifre) errors.sifre = REQUIRED;
  else if (account.sifre.length < 8) errors.sifre = "Şifre en az 8 karakter olmalı.";

  if (!account.sifreTekrar) errors.sifreTekrar = REQUIRED;
  else if (account.sifre !== account.sifreTekrar) errors.sifreTekrar = "Şifreler eşleşmiyor.";

  return errors;
}

export function validateBusiness(data: SellerApplicationData): FieldErrors {
  const { business, sellerType } = data;
  const errors: FieldErrors = {};

  if (sellerType === "sahis") {
    if (!business.ticariUnvan.trim()) errors.ticariUnvan = REQUIRED;
    if (!business.vergiDairesi.trim()) errors.vergiDairesi = REQUIRED;
    if (!business.vergiNumarasi.trim()) errors.vergiNumarasi = REQUIRED;
    else if (!isValidTaxNumber(business.vergiNumarasi)) {
      errors.vergiNumarasi = "10 veya 11 haneli vergi numarası / TCKN girin.";
    }
    if (!business.isletmeAdresi.trim()) errors.isletmeAdresi = REQUIRED;
    if (!business.il.trim()) errors.il = REQUIRED;
    if (!business.ilce.trim()) errors.ilce = REQUIRED;
  }

  if (sellerType === "limited-as") {
    if (!business.sirketUnvani.trim()) errors.sirketUnvani = REQUIRED;
    if (!business.vergiNumarasi.trim()) errors.vergiNumarasi = REQUIRED;
    else if (!isValidTaxNumber(business.vergiNumarasi)) {
      errors.vergiNumarasi = "10 haneli vergi numarası girin.";
    }
    if (!business.vergiDairesi.trim()) errors.vergiDairesi = REQUIRED;
    if (!business.mersisNumarasi.trim()) errors.mersisNumarasi = REQUIRED;
    if (!business.ticaretSicilNumarasi.trim()) errors.ticaretSicilNumarasi = REQUIRED;
    if (!business.yetkiliKisi.trim()) errors.yetkiliKisi = REQUIRED;
    if (!business.sirketAdresi.trim()) errors.sirketAdresi = REQUIRED;
    if (!business.il.trim()) errors.il = REQUIRED;
    if (!business.ilce.trim()) errors.ilce = REQUIRED;
  }

  return errors;
}

export function validateBank(data: SellerApplicationData): FieldErrors {
  const { bank } = data;
  const errors: FieldErrors = {};

  if (!bank.iban.trim()) errors.iban = REQUIRED;
  else if (!isValidTrIban(bank.iban)) errors.iban = "Geçerli bir TR IBAN girin (TR + 24 rakam).";

  if (!bank.bankaAdi.trim()) errors.bankaAdi = REQUIRED;
  if (!bank.hesapSahibiAdi.trim()) errors.hesapSahibiAdi = REQUIRED;

  return errors;
}

export function validateDocuments(data: SellerApplicationData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.documents.kimlik) errors.kimlik = "Kimlik belgesi zorunludur.";

  if (data.sellerType === "sahis") {
    if (!data.documents.vergiLevhasi) errors.vergiLevhasi = "Vergi levhası zorunludur.";
    if (!data.documents.imzaBeyannamesi) errors.imzaBeyannamesi = "İmza beyannamesi zorunludur.";
  }

  if (data.sellerType === "limited-as") {
    if (!data.documents.vergiLevhasi) errors.vergiLevhasi = "Vergi levhası zorunludur.";
    if (!data.documents.imzaBeyannamesi) errors.imzaBeyannamesi = "İmza sirküleri zorunludur.";
    if (!data.documents.ticaretSicilBelgesi) errors.ticaretSicilBelgesi = "Ticaret sicil belgesi zorunludur.";
    if (!data.documents.faaliyetBelgesi) errors.faaliyetBelgesi = "Faaliyet belgesi zorunludur.";
  }

  return errors;
}

export function validateStore(data: SellerApplicationData): FieldErrors {
  const { store, shipping } = data;
  const errors: FieldErrors = {};

  if (!store.magazaAdi.trim()) errors.magazaAdi = REQUIRED;
  if (!store.magazaSlug.trim()) errors.magazaSlug = REQUIRED;
  if (!store.aciklama.trim()) errors.aciklama = REQUIRED;
  if (store.anaKategoriler.length === 0) errors.anaKategoriler = "En az bir kategori seçin.";

  if (!shipping.il.trim()) errors.shippingIl = REQUIRED;
  if (!shipping.ilce.trim()) errors.shippingIlce = REQUIRED;
  if (!shipping.acikAdres.trim()) errors.shippingAcikAdres = REQUIRED;

  if (!shipping.iadeAdresiAyni) {
    if (!shipping.iadeIl.trim()) errors.iadeIl = REQUIRED;
    if (!shipping.iadeIlce.trim()) errors.iadeIlce = REQUIRED;
    if (!shipping.iadeAcikAdres.trim()) errors.iadeAcikAdres = REQUIRED;
  }

  return errors;
}

export function validateInvoice(data: SellerApplicationData): FieldErrors {
  return data.invoicePreference ? {} : { invoicePreference: "Bir fatura seçeneği seçin." };
}

export function validatePlan(data: SellerApplicationData): FieldErrors {
  return data.planId ? {} : { planId: "Devam etmek için bir paket seçin." };
}

export function validateAgreement(data: SellerApplicationData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.agreement.sozlesmeKabul) errors.sozlesmeKabul = "Devam etmek için satıcı sözleşmesini onaylayın.";
  if (!data.agreement.kvkkKabul) errors.kvkkKabul = "Devam etmek için KVKK metnini onaylayın.";
  return errors;
}
