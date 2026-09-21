import type { SellerApplicationData } from "@/types/seller-application";

/**
 * Satıcı başvurusu veritabanına gönderilmeden önce arındırılır (veri minimizasyonu / KVKK):
 *  - Şifre, TC kimlik numarası ve doğum tarihi ASLA gönderilmez.
 *  - IBAN yalnızca son 4 hanesiyle maskelenmiş olarak gönderilir.
 *  - Belgeler için yalnızca dosya adı/boyut gibi meta bilgi gider; dosya içeriği gitmez.
 */
export type SanitizedApplication = {
  version: 1;
  sellerType: string | null;
  contact: { name: string; email: string; phone: string };
  business: Record<string, string>;
  bank: { ibanMasked: string; bankName: string; holderName: string };
  shipping: Record<string, string | boolean>;
  store: { name: string; description: string; categories: string[] };
  documents: Record<string, { name: string; size: number; type: string }>;
  invoicePreference: string | null;
  planId: string | null;
  agreement: { contract: boolean; kvkk: boolean; commercialMessages: boolean };
};

export function maskIban(iban: string): string {
  const cleaned = iban.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 8) return "";
  return `${cleaned.slice(0, 2)}** **** **** **** **** ${cleaned.slice(-4)}`;
}

function text(value: string | undefined, max = 200): string {
  return (value ?? "").trim().slice(0, max);
}

export function sanitizeApplication(data: SellerApplicationData): SanitizedApplication {
  const documents: SanitizedApplication["documents"] = {};
  for (const [key, meta] of Object.entries(data.documents)) {
    if (meta) documents[key] = { name: text(meta.name, 120), size: meta.size, type: text(meta.type, 60) };
  }
  return {
    version: 1,
    sellerType: data.sellerType,
    contact: { name: text(`${data.account.ad} ${data.account.soyad}`, 120), email: text(data.account.email, 150), phone: text(data.account.telefon, 30) },
    business: {
      ticariUnvan: text(data.business.ticariUnvan),
      vergiDairesi: text(data.business.vergiDairesi),
      vergiNumarasi: text(data.business.vergiNumarasi, 20),
      isletmeAdresi: text(data.business.isletmeAdresi, 300),
      il: text(data.business.il, 60),
      ilce: text(data.business.ilce, 60),
      sirketUnvani: text(data.business.sirketUnvani),
      mersisNumarasi: text(data.business.mersisNumarasi, 20),
      ticaretSicilNumarasi: text(data.business.ticaretSicilNumarasi, 30),
      yetkiliKisi: text(data.business.yetkiliKisi),
      sirketAdresi: text(data.business.sirketAdresi, 300),
    },
    bank: { ibanMasked: maskIban(data.bank.iban), bankName: text(data.bank.bankaAdi, 80), holderName: text(data.bank.hesapSahibiAdi, 120) },
    shipping: {
      il: text(data.shipping.il, 60),
      ilce: text(data.shipping.ilce, 60),
      acikAdres: text(data.shipping.acikAdres, 300),
      iadeAdresiAyni: data.shipping.iadeAdresiAyni,
      iadeIl: text(data.shipping.iadeIl, 60),
      iadeIlce: text(data.shipping.iadeIlce, 60),
      iadeAcikAdres: text(data.shipping.iadeAcikAdres, 300),
    },
    store: { name: text(data.store.magazaAdi, 80), description: text(data.store.aciklama, 1000), categories: data.store.anaKategoriler.slice(0, 12).map((category) => text(category, 60)) },
    documents,
    invoicePreference: data.invoicePreference,
    planId: data.planId,
    agreement: { contract: data.agreement.sozlesmeKabul, kvkk: data.agreement.kvkkKabul, commercialMessages: data.agreement.ticariIletiKabul },
  };
}
