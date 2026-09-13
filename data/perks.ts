import { PackagePlus, MessageCircleHeart, ShieldCheck, Truck } from "lucide-react";
import type { Perk } from "@/types";

export const perks: Perk[] = [
  {
    icon: PackagePlus,
    title: "AI Ürün Ekleme",
    description: "Ürünün fotoğrafını yükle, açıklama, SEO ve kategoriyi AI'dan gelsin.",
    tone: "purple",
  },
  {
    icon: MessageCircleHeart,
    title: "AI Alışveriş Asistanı",
    description: "Müşterinin isteğini anlar, en uygun ürünleri bulur.",
    tone: "blue",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Alışveriş",
    description: "Koruma sistemi, kolay iade ve 7/24 canlı destek.",
    tone: "green",
  },
  {
    icon: Truck,
    title: "Akıllı Lojistik",
    description: "En hızlı ve en uygun kargo seçimi otomatik yapılır.",
    tone: "orange",
  },
];
