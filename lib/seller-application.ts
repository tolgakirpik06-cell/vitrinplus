import type { ApplicationStatus, SellerApplicationData, SellerPlan, SellerPlanId, SellerType } from "@/types/seller-application";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/lib/storage-migration";
import { planList, planPriceLabel } from "@/lib/plans";

export const SELLER_DRAFT_STORAGE_KEY = STORAGE_KEYS.sellerDraft;
export const SELLER_SUBMITTED_STORAGE_KEY = STORAGE_KEYS.sellerSubmitted;
/** Eski "PazarBuy" dönemi anahtarları — yalnızca okuma/taşıma için (bkz. lib/storage-migration.ts). */
export const LEGACY_SELLER_DRAFT_STORAGE_KEY = LEGACY_STORAGE_KEYS.sellerDraft;
export const LEGACY_SELLER_SUBMITTED_STORAGE_KEY = LEGACY_STORAGE_KEYS.sellerSubmitted;

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

/** Başvuru sihirbazındaki paket kartları merkezi paket config'inden (lib/plans.ts) üretilir. */
export const sellerPlans: SellerPlan[] = planList.map((plan) => ({
  id: plan.key,
  name: plan.name,
  tagline: plan.tagline,
  priceLabel:
    plan.monthlyPrice === null
      ? "Teklif Al"
      : `${planPriceLabel(plan, "monthly")} · ${planPriceLabel(plan, "yearly")}`,
  features: plan.features,
  featured: plan.featured,
}));

const LEGACY_PLAN_IDS: Record<string, SellerPlanId> = {
  baslangic: "vitrin",
  pro: "vitrin-plus",
  premium: "vitrin-pro-plus",
};

/**
 * Eski taslaklardaki değerleri yeni adlandırmaya çevirir:
 * planId "baslangic|pro|premium" ve invoicePreference "pazarbuy-entegrasyonu".
 * Bilinmeyen paket kimliği null'a düşer; kullanıcı tekrar seçer.
 */
export function normalizeApplicationData(data: SellerApplicationData): SellerApplicationData {
  const rawPlan = data.planId as string | null;
  const rawInvoice = data.invoicePreference as string | null;
  const knownPlans: string[] = planList.map((plan) => plan.key);
  const planId: SellerPlanId | null = rawPlan === null ? null : knownPlans.includes(rawPlan) ? (rawPlan as SellerPlanId) : (LEGACY_PLAN_IDS[rawPlan] ?? null);
  const invoicePreference = rawInvoice === "pazarbuy-entegrasyonu" ? "vitrinplus-entegrasyonu" : data.invoicePreference;
  return { ...data, planId, invoicePreference };
}

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
  return `VP-${y}-${rand}`;
}
