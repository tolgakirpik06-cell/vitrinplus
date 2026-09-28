import type { Campaign } from "@/types";

export const campaigns: Campaign[] = [
  {
    id: "super-firsatlar",
    title: "Vitrini Keşfet",
    subtitle: "Mağazaların güncel ürünlerini incele",
    badge: "Keşfet",
    ctaLabel: "Fırsatları Keşfet",
    // Kampanya listesine değil, doğrudan ana sayfadaki "Süper Fırsatlar"
    // ürün satırına yönlendirir — tıklanan kampanya ile gösterilen ürünler
    // artık gerçekten eşleşiyor (madde 12).
    href: "/kampanyalar",
    tone: "brand",
  },
  {
    id: "satici-ol",
    title: "%0 Komisyonla Mağazanı Aç",
    subtitle: "VitrinPlus satıcı planlarını incele",
    badge: "Satıcılara Özel",
    ctaLabel: "Hemen Başvur",
    href: "/satici-basvuru",
    tone: "navy",
  },
  {
    id: "yeni-sezon",
    title: "Yeni Sezon Trendleri",
    subtitle: "Kadın & erkek giyimde yeni gelenler",
    badge: "Yeni",
    ctaLabel: "Keşfet",
    href: "/kategori/kadin",
    tone: "navy",
  },
  {
    id: "hizli-teslimat",
    title: "Elektronik Vitrini",
    subtitle: "Elektronik kategorisini keşfet",
    badge: "Teknoloji",
    ctaLabel: "İncele",
    href: "/kategori/elektronik",
    tone: "navy",
  },
  {
    id: "supermarket-firsat",
    title: "Markette Bu Hafta",
    subtitle: "Market ürünlerini keşfet",
    badge: "Market",
    ctaLabel: "Markete Git",
    href: "/kategori/supermarket",
    tone: "navy",
  },
  {
    id: "kozmetik-firsat",
    title: "Cilt Bakımı Günleri",
    subtitle: "Güzellik ve bakım ürünlerini keşfet",
    badge: "Bakım",
    ctaLabel: "Alışverişe Başla",
    href: "/kategori/kozmetik",
    tone: "brand",
  },
];
