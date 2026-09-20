import type { ApplicationStatus, SellerPlan, SellerType } from "@/types/seller-application";

export const SELLER_DRAFT_STORAGE_KEY = "pazarbuy:satici-basvuru-taslak";
export const SELLER_SUBMITTED_STORAGE_KEY = "pazarbuy:satici-basvuru-gonderildi";

export type SubmittedApplicationSummary = {
  /** Başvurunun herkese açık referans numarası. */
  reference: string;
  /** Durum sorgusunda kullanılan rastgele erişim anahtarı. */
  accessToken: string;
  status: ApplicationStatus;
  magazaAdi: string;
  submittedAt: string;
};

/**
 * Mağaza adından URL-uyumlu bir slug üretir (Türkçe karakter dönüşümü dahil).
 * Örn: "TeknoCenter Mağazası" -> "teknocenter-magazasi"
 */
export function slugifyStoreName(value: string): string {
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  return value
    .split("")
    .map((char) => trMap[char] ?? char)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * TR IBAN biçim kontrolü: "TR" + 24 rakam (toplam 26 karakter).
 * Gerçek bir banka doğrulaması yapılmaz — sadece format/uzunluk kontrolü.
 */
export function isValidTrIban(value: string): boolean {
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return /^TR\d{24}$/.test(cleaned);
}

export function formatIbanForDisplay(value: string): string {
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export function isValidTcKimlik(value: string): boolean {
  return /^\d{11}$/.test(value);
}

export function isValidTaxNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export const sellerTypeLabels: Record<SellerType, string> = {
  sahis: "Şahıs İşletmesi",
  "limited-as": "Limited / Anonim Şirket",
};

export const sellerPlans: SellerPlan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    tagline: "Yeni başlayan satıcılar için",
    priceLabel: "Yakında açıklanacak",
    features: ["Sınırsız ürün", "Temel istatistikler", "E-posta destek", "1 Mağaza"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Büyüyen mağazalar için",
    priceLabel: "Yakında açıklanacak",
    features: ["Sınırsız ürün", "Gelişmiş istatistikler", "Reklam araçları", "Öncelikli destek"],
    featured: true,
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Yüksek hacimli mağazalar için",
    priceLabel: "Yakında açıklanacak",
    features: ["Sınırsız ürün", "Premium görünürlük", "API erişimi", "Özel hesap yöneticisi"],
  },
];

export const sellerDocumentConfig: {
  key: "kimlik" | "vergiLevhasi" | "imzaBeyannamesi" | "ticaretSicilBelgesi" | "faaliyetBelgesi";
  label: string;
  description: string;
  sellerTypes: SellerType[];
}[] = [
  {
    key: "kimlik",
    label: "Kimlik Belgesi",
    description: "T.C. kimlik kartı veya nüfus cüzdanı (ön-arka)",
    sellerTypes: ["sahis", "limited-as"],
  },
  {
    key: "vergiLevhasi",
    label: "Vergi Levhası",
    description: "Güncel tarihli vergi levhası",
    sellerTypes: ["sahis", "limited-as"],
  },
  {
    key: "imzaBeyannamesi",
    label: "İmza Beyannamesi / Sirküleri",
    description: "Noter onaylı imza beyannamesi veya sirküleri",
    sellerTypes: ["sahis", "limited-as"],
  },
  {
    key: "ticaretSicilBelgesi",
    label: "Ticaret Sicil Belgesi",
    description: "Ticaret Sicil Gazetesi veya sicil belgesi",
    sellerTypes: ["limited-as"],
  },
  {
    key: "faaliyetBelgesi",
    label: "Faaliyet Belgesi",
    description: "İlgili odadan alınmış faaliyet belgesi",
    sellerTypes: ["limited-as"],
  },
];

export function generateApplicationId(): string {
  const date = new Date();
  const y = date.getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PB-${y}-${rand}`;
}
