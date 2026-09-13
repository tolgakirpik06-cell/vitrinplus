import type { LucideIcon } from "lucide-react";

export type AiTagType = "price" | "delivery" | "rating" | "smart";

export type AiTag = {
  type: AiTagType;
  label: string;
};

export type ShippingInfo = {
  label: string;
  variant: "fast" | "free" | "standard";
};

export type ProductVisualKey =
  | "gaming-pc"
  | "phone"
  | "headphones"
  | "sneaker"
  | "vacuum"
  | "watch"
  | "tablet"
  | "laptop"
  | "perfume"
  | "airfryer"
  | "generic";

export type ProductSectionTag =
  | "super-firsatlar"
  | "gunun-firsatlari"
  | "en-cok-satanlar"
  | "sana-ozel"
  | "hizli-teslimat"
  | "ai-onerileri"
  | "en-iyi-fiyat"
  | "yeni-gelenler";

export type VariantType = "renk" | "beden" | "hafiza" | "model";

export type ProductVariantGroup = {
  type: VariantType;
  label: string;
  options: string[];
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: string;
  /** URL'de kullanılan benzersiz kimlik, /urun/[slug] route'unda kullanılır. */
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  /** Yüzde olarak indirim oranı — oldPrice'tan hesaplanır. */
  discount?: number;
  rating: number;
  reviewCount: number;
  seller: string;
  stock: number;
  shipping: ShippingInfo;
  aiTag: AiTag;
  visual: ProductVisualKey;
  /** Sadece visual === "generic" olduğunda kullanılır. */
  icon?: LucideIcon;
  /**
   * Galeri görünüm etiketleri. Gerçek ürün fotoğrafı yerine elle çizilmiş
   * illüstrasyon kullanıldığından bunlar gerçek dosya değil, aynı
   * illüstrasyonun farklı açı/detay varyasyonlarını temsil eden etiketlerdir.
   */
  images: string[];
  description: string;
  specifications: ProductSpec[];
  variants?: ProductVariantGroup[];
  tags: ProductSectionTag[];
};

export type HeroFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type Stat = {
  icon: LucideIcon;
  value: string;
  label: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  price: number;
  period: string;
  featured?: boolean;
  features: string[];
};

export type Perk = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "orange" | "purple" | "blue" | "green";
};

export type ProductRowAccent = "brand" | "rose" | "emerald" | "sky" | "violet";

export type ProductRowConfig = {
  id: string;
  tag: ProductSectionTag;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accent: ProductRowAccent;
  showRank?: boolean;
};

/** Mega menüdeki küçük kampanya kartı. */
export type CategoryCampaign = {
  badge: string;
  title: string;
  subtitle: string;
};

/** Yatay kategori barındaki ana kategoriler (mega menülü). */
export type MainCategory = {
  id: string;
  slug: string;
  name: string;
  icon: LucideIcon;
  subcategories: string[];
  brands: string[];
  campaign: CategoryCampaign;
};

/** "Diğer Kategoriler" açılır panelindeki ek kategoriler. */
export type ExtraCategory = {
  id: string;
  slug: string;
  name: string;
  icon: LucideIcon;
};

/** Footer / mobil menü gibi basit liste gösterimleri için ortak şekil. */
export type NavCategory = {
  id: string;
  slug: string;
  name: string;
  icon: LucideIcon;
  href: string;
};

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type Store = {
  id: string;
  slug: string;
  name: string;
  categoryLabel: string;
  rating: number;
  productCount: number;
  followerCount: string;
  badge?: "founder" | "verified";
  tone: "brand" | "navy" | "violet" | "emerald" | "sky" | "rose";
};

export type Campaign = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  href: string;
  tone: "brand" | "navy" | "violet" | "emerald" | "sky" | "rose";
};

/**
 * Sepetteki tek bir satır. Ağır/serileştirilemeyen alanlar (görsel, ikon
 * component'i vb.) YOK — sadece localStorage'a güvenle yazılabilecek
 * ilkel değerler. Ürünün güncel adı/fiyatı/görseli her zaman
 * getProductBySlug(slug) ile canlı olarak çözülür (tek doğruluk kaynağı).
 */
export type CartLine = {
  /** slug + varyant birleşimi, aynı üründen farklı varyantları ayırt eder. */
  lineId: string;
  slug: string;
  quantity: number;
  variantLabel?: string;
};
