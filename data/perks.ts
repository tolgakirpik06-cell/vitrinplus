import { ShieldCheck, Undo2, BadgeCheck, Truck } from "lucide-react";
import type { Perk } from "@/types";

export const perks: Perk[] = [
  {
    icon: ShieldCheck,
    title: "Güvenli Ödeme",
    description: "Tüm ödemeler 256-bit şifreleme ile korunur.",
    tone: "purple",
  },
  {
    icon: Undo2,
    title: "Kolay İade",
    description: "14 gün içinde ücretsiz iade ve değişim hakkı.",
    tone: "blue",
  },
  {
    icon: BadgeCheck,
    title: "Doğrulanmış Satıcılar",
    description: "Her mağaza kimlik ve kalite kontrolünden geçer.",
    tone: "green",
  },
  {
    icon: Truck,
    title: "Hızlı Teslimat",
    description: "En hızlı ve en uygun kargo seçimi otomatik yapılır.",
    tone: "orange",
  },
];
