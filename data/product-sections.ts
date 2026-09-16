import { Flame, Zap, TrendingUp, Wand2, Rocket, Sparkles, Tag, PackageOpen } from "lucide-react";
import type { ProductRowConfig } from "@/types";

export const productRows: ProductRowConfig[] = [
  {
    id: "super-firsatlar",
    tag: "super-firsatlar",
    title: "Süper Fırsatlar",
    subtitle: "Seçili ürünlerde büyük indirim",
    icon: Flame,
    accent: "rose",
  },
  {
    id: "en-iyi-fiyat",
    tag: "en-iyi-fiyat",
    title: "En İyi Fiyat",
    subtitle: "Bütçe dostu, kaliteli seçenekler",
    icon: Tag,
    accent: "emerald",
  },
  {
    id: "gunun-flas-urunleri",
    tag: "gunun-firsatlari",
    title: "Günün Flaş Ürünleri",
    subtitle: "Sadece bugüne özel",
    icon: Zap,
    accent: "brand",
  },
  {
    id: "cok-satanlar",
    tag: "en-cok-satanlar",
    title: "Çok Satanlar",
    subtitle: "Bu hafta en çok tercih edilenler",
    icon: TrendingUp,
    accent: "emerald",
    showRank: true,
  },
  {
    id: "sana-ozel",
    tag: "sana-ozel",
    title: "Sana Özel Seçimler",
    subtitle: "Alışveriş geçmişine göre seçildi",
    icon: Wand2,
    accent: "violet",
  },
  {
    id: "yeni-gelenler",
    tag: "yeni-gelenler",
    title: "Yeni Gelenler",
    subtitle: "Rafa yeni eklenenler",
    icon: PackageOpen,
    accent: "sky",
  },
  {
    id: "hizli-teslimat",
    tag: "hizli-teslimat",
    title: "Hızlı Teslimat",
    subtitle: "Bugün kargoda",
    icon: Rocket,
    accent: "sky",
  },
  {
    id: "ai-onerileri",
    tag: "ai-onerileri",
    title: "Günün Öne Çıkanları",
    icon: Sparkles,
    accent: "brand",
  },
];
