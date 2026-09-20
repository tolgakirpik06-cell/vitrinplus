/**
 * VitrinPlus paket sistemi — TEK merkezi kaynak.
 *
 * Fiyatlar ve limitler onaylı iş kararlarıdır; başka bir yerde tekrar
 * yazılmamalı, buradan okunmalıdır. Ek ürün kapasitesi fiyatları henüz
 * BELİRLENMEDİ — bu dosyada da, arayüzde de uydurulmuş bir fiyat yer almaz.
 */

export type PlanKey = "vitrin" | "vitrin-plus" | "vitrin-pro-plus" | "vitrin-enterprise";

export const PLAN_ORDER: PlanKey[] = ["vitrin", "vitrin-plus", "vitrin-pro-plus", "vitrin-enterprise"];

/** Yeni bir satıcı için varsayılan demo paketi. Mevcut çalışan özellikler açık kalsın diye "Vitrin Plus". */
export const DEFAULT_PLAN_KEY: PlanKey = "vitrin-plus";

/** Tüm paketlerde geçerli sabit kurallar. */
export const COMMISSION_RATE = 0;
export const COMMISSION_LABEL = "%0 satış komisyonu";
export const UNLIMITED_ORDERS_LABEL = "Sınırsız sipariş";

export type PlanFeatureKey =
  // Tüm paketlerde
  | "storePage"
  | "productManagement"
  | "stockManagement"
  | "bulkStockUpdate"
  | "orderManagement"
  | "earningsTracking"
  | "basicReports"
  | "basicStoreCustomization"
  | "standardSupport"
  // Vitrin Plus ve üstü
  | "advancedReports"
  | "campaigns"
  | "coupons"
  | "bulkProductUpload"
  | "csvImport"
  | "adTools"
  | "advancedStoreCustomization"
  | "fasterSupport"
  // Vitrin Pro Plus ve üstü
  | "proReports"
  | "proStoreCustomization"
  | "staffAccounts"
  | "apiAccess"
  | "prioritySupport"
  // Enterprise
  | "enterpriseReports"
  | "customStorefront"
  | "erpIntegration"
  | "multiWarehouse"
  | "multiStore"
  | "customIntegrations"
  | "dedicatedSupport";

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Aylık fiyat (TL). null → sabit fiyat yok, teklif usulü. */
  monthlyPrice: number | null;
  /** Yıllık fiyat (TL). null → sabit fiyat yok. */
  yearlyPrice: number | null;
  /** Standart ürün limiti. null → özel / teklife göre. */
  productLimit: number | null;
  productLimitLabel: string;
  featured?: boolean;
  badge?: string;
  ctaLabel: string;
  /** Reklam fiyatlarına paket indirimi (yüzde). null → özel. */
  adDiscountPercent: number | null;
  adAdvantageLabel: string;
  /** Kartlarda gösterilen özellik listesi. */
  features: string[];
  /** Bu pakette açık olan gelişmiş özellikler (temel özellikler tüm paketlerde açık). */
  unlocks: PlanFeatureKey[];
};

const BASE_FEATURES: PlanFeatureKey[] = [
  "storePage",
  "productManagement",
  "stockManagement",
  "bulkStockUpdate",
  "orderManagement",
  "earningsTracking",
  "basicReports",
  "basicStoreCustomization",
  "standardSupport",
];

const PLUS_FEATURES: PlanFeatureKey[] = [
  ...BASE_FEATURES,
  "advancedReports",
  "campaigns",
  "coupons",
  "bulkProductUpload",
  "csvImport",
  "adTools",
  "advancedStoreCustomization",
  "fasterSupport",
];

const PRO_PLUS_FEATURES: PlanFeatureKey[] = [
  ...PLUS_FEATURES,
  "proReports",
  "proStoreCustomization",
  "staffAccounts",
  "apiAccess",
  "prioritySupport",
];

const ENTERPRISE_FEATURES: PlanFeatureKey[] = [
  ...PRO_PLUS_FEATURES,
  "enterpriseReports",
  "customStorefront",
  "erpIntegration",
  "multiWarehouse",
  "multiStore",
  "customIntegrations",
  "dedicatedSupport",
];

export const plans: Record<PlanKey, Plan> = {
  vitrin: {
    key: "vitrin",
    name: "Vitrin Paket",
    tagline: "Satışa hızlı başlayan mağazalar için",
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    productLimit: 100,
    productLimitLabel: "100 ürün",
    ctaLabel: "Vitrin Paket'i Seç",
    adDiscountPercent: 0,
    adAdvantageLabel: "Standart reklam fiyatı",
    features: [
      "100 ürün",
      "%0 satış komisyonu",
      "Sınırsız sipariş",
      "Mağaza sayfası",
      "Ürün ve stok yönetimi",
      "Sipariş yönetimi",
      "Kazanç ve ödeme takibi",
      "Temel satış raporları",
      "Temel mağaza özelleştirme",
      "Standart destek",
    ],
    unlocks: BASE_FEATURES,
  },
  "vitrin-plus": {
    key: "vitrin-plus",
    name: "Vitrin Plus",
    tagline: "Büyüyen mağazalar için en dengeli paket",
    monthlyPrice: 3499,
    yearlyPrice: 34990,
    productLimit: 1000,
    productLimitLabel: "1.000 ürün",
    featured: true,
    badge: "En Çok Tercih Edilen",
    ctaLabel: "Vitrin Plus'a Geç",
    adDiscountPercent: 5,
    adAdvantageLabel: "Reklam fiyatlarında %5 avantaj",
    features: [
      "1.000 ürün",
      "Vitrin Paket özellikleri +",
      "Gelişmiş raporlar",
      "Kampanya oluşturma",
      "İndirim kuponları",
      "Toplu ürün yükleme",
      "Excel/CSV import",
      "VitrinPlus reklam araçları",
      "Gelişmiş mağaza özelleştirme",
      "Daha hızlı destek",
    ],
    unlocks: PLUS_FEATURES,
  },
  "vitrin-pro-plus": {
    key: "vitrin-pro-plus",
    name: "Vitrin Pro Plus",
    tagline: "Profesyonel ve yüksek hacimli satıcılar için",
    monthlyPrice: 5999,
    yearlyPrice: 59990,
    productLimit: 5000,
    productLimitLabel: "5.000 ürün",
    ctaLabel: "Pro Plus'a Geç",
    adDiscountPercent: 10,
    adAdvantageLabel: "Reklam fiyatlarında %10 avantaj",
    features: [
      "5.000 ürün",
      "Vitrin Plus özellikleri +",
      "Profesyonel raporlama",
      "Profesyonel mağaza özelleştirme",
      "Personel / çoklu kullanıcı",
      "API erişimi",
      "Öncelikli destek",
    ],
    unlocks: PRO_PLUS_FEATURES,
  },
  "vitrin-enterprise": {
    key: "vitrin-enterprise",
    name: "Vitrin Enterprise",
    tagline: "Kurumsal ölçek ve özel entegrasyonlar için",
    monthlyPrice: null,
    yearlyPrice: null,
    productLimit: null,
    productLimitLabel: "10.000+ / özel",
    ctaLabel: "Teklif Al",
    adDiscountPercent: null,
    adAdvantageLabel: "Özel reklam koşulları",
    features: [
      "10.000+ / özel ürün kapasitesi",
      "Kurumsal raporlama",
      "Markaya özel storefront",
      "API",
      "ERP / muhasebe entegrasyonları",
      "Çoklu depo",
      "Çoklu mağaza",
      "Özel entegrasyon",
      "Kurumsal / dedicated destek",
    ],
    unlocks: ENTERPRISE_FEATURES,
  },
};

export const planList: Plan[] = PLAN_ORDER.map((key) => plans[key]);

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_ORDER as string[]).includes(value);
}

export function getPlan(key: PlanKey | null | undefined): Plan {
  return plans[key ?? DEFAULT_PLAN_KEY];
}

export function planRank(key: PlanKey): number {
  return PLAN_ORDER.indexOf(key);
}

export function nextPlan(key: PlanKey): Plan | null {
  const next = PLAN_ORDER[planRank(key) + 1];
  return next ? plans[next] : null;
}

// ─── Özellik kilitleri ───────────────────────────────────────────────────────

export const featureLabels: Record<PlanFeatureKey, string> = {
  storePage: "Mağaza sayfası",
  productManagement: "Ürün yönetimi",
  stockManagement: "Stok yönetimi",
  bulkStockUpdate: "Site içi toplu stok güncelleme",
  orderManagement: "Sipariş yönetimi",
  earningsTracking: "Kazanç ve ödeme takibi",
  basicReports: "Temel satış raporları",
  basicStoreCustomization: "Temel mağaza özelleştirme",
  standardSupport: "Standart destek",
  advancedReports: "Gelişmiş raporlar",
  campaigns: "Kampanya oluşturma",
  coupons: "İndirim kuponları",
  bulkProductUpload: "Toplu ürün yükleme",
  csvImport: "Excel/CSV import",
  adTools: "VitrinPlus reklam araçları",
  advancedStoreCustomization: "Gelişmiş mağaza özelleştirme",
  fasterSupport: "Daha hızlı destek",
  proReports: "Profesyonel raporlama",
  proStoreCustomization: "Profesyonel mağaza özelleştirme",
  staffAccounts: "Personel / çoklu kullanıcı",
  apiAccess: "API erişimi",
  prioritySupport: "Öncelikli destek",
  enterpriseReports: "Kurumsal raporlama",
  customStorefront: "Markaya özel storefront",
  erpIntegration: "ERP / muhasebe entegrasyonları",
  multiWarehouse: "Çoklu depo",
  multiStore: "Çoklu mağaza",
  customIntegrations: "Özel entegrasyon",
  dedicatedSupport: "Kurumsal destek",
};

export function hasFeature(planKey: PlanKey, feature: PlanFeatureKey): boolean {
  return plans[planKey].unlocks.includes(feature);
}

/** Özelliğin açıldığı ilk (en düşük) paket. */
export function requiredPlanFor(feature: PlanFeatureKey): Plan {
  const key = PLAN_ORDER.find((candidate) => plans[candidate].unlocks.includes(feature));
  return plans[key ?? "vitrin-enterprise"];
}

// ─── Ürün kapasitesi ─────────────────────────────────────────────────────────

export type CapacityAddOn = {
  key: string;
  label: string;
  /** Eklenen ürün adedi; null → sınırsız. */
  extraProducts: number | null;
};

/** Ek kapasite seçenekleri. FİYATLARI BELİRLENMEDİ — bilinçli olarak fiyat alanı yok. */
export const capacityAddOns: CapacityAddOn[] = [
  { key: "plus-250", label: "+250 ürün", extraProducts: 250 },
  { key: "plus-500", label: "+500 ürün", extraProducts: 500 },
  { key: "plus-1000", label: "+1.000 ürün", extraProducts: 1000 },
  { key: "plus-2500", label: "+2.500 ürün", extraProducts: 2500 },
  { key: "plus-5000", label: "+5.000 ürün", extraProducts: 5000 },
  { key: "plus-10000", label: "+10.000 ürün", extraProducts: 10000 },
  { key: "unlimited", label: "Sınırsız Ürün", extraProducts: null },
];

export const CAPACITY_PRICE_PENDING_LABEL = "Fiyat daha sonra belirlenecek";

export type ProductCapacity = {
  limit: number | null;
  used: number;
  /** 0–1 arası doluluk; limit yoksa 0. */
  ratio: number;
  remaining: number | null;
  reached: boolean;
};

export function productCapacity(planKey: PlanKey, used: number, addOnKey?: string | null): ProductCapacity {
  const plan = plans[planKey];
  const addOn = capacityAddOns.find((item) => item.key === addOnKey);
  let limit = plan.productLimit;
  if (addOn) limit = addOn.extraProducts === null ? null : (limit ?? 0) + addOn.extraProducts;
  if (limit === null) return { limit: null, used, ratio: 0, remaining: null, reached: false };
  return { limit, used, ratio: limit > 0 ? Math.min(1, used / limit) : 1, remaining: Math.max(0, limit - used), reached: used >= limit };
}

// ─── Fiyat biçimleri ─────────────────────────────────────────────────────────

export function planPriceLabel(plan: Plan, billing: "monthly" | "yearly" = "monthly"): string {
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  if (price === null) return "Teklif Al";
  return `${price.toLocaleString("tr-TR")} TL / ${billing === "monthly" ? "ay" : "yıl"}`;
}

/** Yıllık ödemede aylığa göre tasarruf (TL). Sabit fiyatı olmayan paket için 0. */
export function yearlySavings(plan: Plan): number {
  if (plan.monthlyPrice === null || plan.yearlyPrice === null) return 0;
  return plan.monthlyPrice * 12 - plan.yearlyPrice;
}

// ─── Bağlama duyarlı yükseltme önerisi ───────────────────────────────────────

export type UpgradeSuggestion = {
  target: Plan;
  reason: string;
  tone: "capacity" | "feature" | "enterprise";
};

/**
 * Herkese Enterprise göstermeyiz: öneri, satıcının gerçek kullanımına bakar.
 * Uygun bir neden yoksa null döner ve panelde yükseltme kartı gösterilmez.
 */
export function suggestUpgrade(input: {
  planKey: PlanKey;
  productCount: number;
  capacityAddOnKey?: string | null;
  campaignCount: number;
  monthlyOrderCount: number;
}): UpgradeSuggestion | null {
  const { planKey, productCount, capacityAddOnKey, campaignCount, monthlyOrderCount } = input;
  const next = nextPlan(planKey);
  if (!next) return null;
  const capacity = productCapacity(planKey, productCount, capacityAddOnKey);

  if (capacity.limit !== null && capacity.ratio >= 0.8) {
    if (next.key === "vitrin-enterprise") {
      return {
        target: next,
        tone: "enterprise",
        reason: `Ürün kapasitenin %${Math.round(capacity.ratio * 100)}'ini kullandın. Kurumsal ölçek için özel kapasite ve entegrasyon teklifi alabilirsin.`,
      };
    }
    return {
      target: next,
      tone: "capacity",
      reason: `Ürün kapasitenin %${Math.round(capacity.ratio * 100)}'ini kullandın (${productCount} / ${capacity.limit}). ${next.name} ${next.productLimitLabel} kapasite sunar.`,
    };
  }

  if (planKey === "vitrin" && (campaignCount > 0 || monthlyOrderCount >= 10)) {
    return {
      target: next,
      tone: "feature",
      reason: "Kampanya, indirim kuponu, toplu ürün yükleme ve gelişmiş raporlar Vitrin Plus ile açılır.",
    };
  }

  if (planKey === "vitrin-plus" && productCount >= 300) {
    return {
      target: next,
      tone: "feature",
      reason: "Ürün sayın hızla büyüyor. Pro Plus; API erişimi, personel hesapları ve profesyonel raporlama sunar.",
    };
  }

  return null;
}
