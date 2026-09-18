import {
  Flame,
  Tag,
  Zap,
  TrendingUp,
  Wand2,
  PackageOpen,
  Rocket,
  Sparkles,
  Shirt,
  Footprints,
  Baby,
  Home,
  Dumbbell,
  ShoppingBasket,
  BookOpen,
  Car,
  Smartphone,
  Laptop,
  Watch,
  PawPrint,
  Hammer,
  Gamepad2,
  Tv,
  Bike,
  ShoppingBag,
  Lamp,
  UtensilsCrossed,
  Droplet,
  Coffee,
  type LucideIcon,
} from "lucide-react";

/**
 * Ürün/kategori satırı verisi (Product.icon, ProductRowConfig.icon) Server
 * Component'lerde hesaplanıp bazen "use client" bileşenlere (ör.
 * FeaturedCarousel) prop olarak geçiyor. React Server Components, fonksiyon
 * değerlerini (bileşen referanslarını) Client Component prop'u olarak
 * SERİLEŞTİREMEZ — bu yüzden ikon component referansını doğrudan veri
 * içinde taşımak yerine, veri katmanında yalnızca bu tabloya bakan
 * serileştirilebilir bir string anahtar (IconName) tutulur; gerçek ikon
 * component'i yalnızca render anında, ihtiyaç duyan bileşenin kendi
 * içinde bu map üzerinden çözülür.
 */
export const ICON_MAP = {
  flame: Flame,
  tag: Tag,
  zap: Zap,
  "trending-up": TrendingUp,
  wand2: Wand2,
  "package-open": PackageOpen,
  rocket: Rocket,
  sparkles: Sparkles,
  shirt: Shirt,
  footprints: Footprints,
  baby: Baby,
  home: Home,
  dumbbell: Dumbbell,
  "shopping-basket": ShoppingBasket,
  "book-open": BookOpen,
  car: Car,
  smartphone: Smartphone,
  laptop: Laptop,
  watch: Watch,
  "paw-print": PawPrint,
  hammer: Hammer,
  gamepad2: Gamepad2,
  tv: Tv,
  bike: Bike,
  "shopping-bag": ShoppingBag,
  lamp: Lamp,
  "utensils-crossed": UtensilsCrossed,
  droplet: Droplet,
  coffee: Coffee,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

export function resolveIcon(name: IconName | undefined, fallback: LucideIcon): LucideIcon {
  return name ? ICON_MAP[name] : fallback;
}
