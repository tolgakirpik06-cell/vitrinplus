import type { PricingPlan } from "@/types";

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 499,
    period: "TL/Ay",
    features: ["Sınırsız ürün", "Temel istatistikler", "7/24 Destek", "1 Mağaza"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 999,
    period: "TL/Ay",
    featured: true,
    features: ["Sınırsız ürün", "Gelişmiş istatistikler", "Reklam araçları", "5 Mağaza"],
  },
  {
    id: "business",
    name: "Business",
    price: 1999,
    period: "TL/Ay",
    features: ["Sınırsız ürün", "Premium özellikler", "API erişimi", "Sınırsız mağaza"],
  },
];
