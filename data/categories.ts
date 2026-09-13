import {
  Shirt,
  Baby,
  Home,
  PlugZap,
  Sparkles,
  Dumbbell,
  ShoppingBasket,
  BookOpen,
  Car,
  Smartphone,
  Laptop,
  Footprints,
  Watch,
  PawPrint,
  Hammer,
  Gamepad2,
} from "lucide-react";
import type { MainCategory, ExtraCategory, NavCategory } from "@/types";

/** Trendyol tarzı yatay kategori barındaki 10 ana kategori (mega menülü). */
export const mainCategories: MainCategory[] = [
  {
    id: "kadin",
    slug: "kadin",
    name: "Kadın",
    icon: Shirt,
    subcategories: [
      "Elbise",
      "Ceket & Mont",
      "Bluz & Gömlek",
      "Pantolon & Jean",
      "Etek",
      "Ayakkabı",
      "Çanta",
      "İç Giyim",
    ],
    brands: ["Koton", "LC Waikiki", "Mango", "Zara", "DeFacto", "Ipekyol"],
    campaign: {
      badge: "Kadın",
      title: "Sezon Sonu Fırsatı",
      subtitle: "Seçili ürünlerde %60'a varan indirim",
    },
  },
  {
    id: "erkek",
    slug: "erkek",
    name: "Erkek",
    icon: Shirt,
    subcategories: [
      "Tişört",
      "Gömlek",
      "Ceket & Mont",
      "Pantolon",
      "Ayakkabı",
      "Aksesuar",
      "İç Giyim",
      "Spor Giyim",
    ],
    brands: ["LC Waikiki", "Koton", "DeFacto", "Kiğılı", "Mavi", "Levi's"],
    campaign: {
      badge: "Erkek",
      title: "Yeni Sezon",
      subtitle: "Günlük giyimde 3 al 2 öde",
    },
  },
  {
    id: "anne-cocuk",
    slug: "anne-cocuk",
    name: "Anne & Çocuk",
    icon: Baby,
    subcategories: [
      "Bebek Bezi & Islak Mendil",
      "Bebek Giyim",
      "Oyuncak",
      "Mama & Beslenme",
      "Puset & Ana Kucağı",
      "Çocuk Giyim",
    ],
    brands: ["Prima", "Chicco", "Huggies", "Fisher-Price", "Mothercare", "LEGO"],
    campaign: {
      badge: "Bebek",
      title: "Bebek Ayına Özel",
      subtitle: "Bebek bakım ürünlerinde ekstra %20",
    },
  },
  {
    id: "ev-yasam",
    slug: "ev-yasam",
    name: "Ev & Yaşam",
    icon: Home,
    subcategories: [
      "Mobilya",
      "Dekorasyon",
      "Mutfak Gereçleri",
      "Nevresim Takımı",
      "Aydınlatma",
      "Banyo Tekstili",
      "Küçük Ev Aletleri",
    ],
    brands: ["English Home", "Madame Coco", "Karaca", "Bosch", "Arçelik", "İkea"],
    campaign: {
      badge: "Ev",
      title: "Eve Dair Her Şey",
      subtitle: "Dekorasyonda 2. ürün %50 indirimli",
    },
  },
  {
    id: "elektronik",
    slug: "elektronik",
    name: "Elektronik",
    icon: PlugZap,
    subcategories: [
      "Telefon",
      "Bilgisayar & Tablet",
      "Televizyon",
      "Kulaklık & Ses",
      "Akıllı Saat",
      "Beyaz Eşya",
      "Oyun & Konsol",
    ],
    brands: ["Apple", "Samsung", "Xiaomi", "Sony", "LG", "Lenovo"],
    campaign: {
      badge: "Teknoloji",
      title: "Teknoloji Haftası",
      subtitle: "Akıllı telefonlarda 12 taksit fırsatı",
    },
  },
  {
    id: "kozmetik",
    slug: "kozmetik",
    name: "Kozmetik",
    icon: Sparkles,
    subcategories: ["Cilt Bakımı", "Makyaj", "Parfüm", "Saç Bakımı", "Kişisel Bakım", "Erkek Bakım"],
    brands: ["L'Oréal", "Maybelline", "Nivea", "The Ordinary", "Flormar", "Bioderma"],
    campaign: {
      badge: "Bakım",
      title: "Cilt Bakımı Günleri",
      subtitle: "2. ürüne özel %30 indirim",
    },
  },
  {
    id: "spor-outdoor",
    slug: "spor-outdoor",
    name: "Spor & Outdoor",
    icon: Dumbbell,
    subcategories: ["Koşu", "Fitness Ekipmanları", "Outdoor & Kamp", "Bisiklet", "Spor Giyim", "Spor Ayakkabı"],
    brands: ["Nike", "Adidas", "Puma", "Decathlon", "New Balance", "Under Armour"],
    campaign: {
      badge: "Spor",
      title: "Formda Kal",
      subtitle: "Koşu ayakkabılarında %40'a varan indirim",
    },
  },
  {
    id: "supermarket",
    slug: "supermarket",
    name: "Süpermarket",
    icon: ShoppingBasket,
    subcategories: ["Temel Gıda", "İçecek", "Atıştırmalık", "Temizlik", "Kişisel Bakım", "Kahvaltılık"],
    brands: ["Ülker", "Eti", "Coca-Cola", "Pınar", "Sırma", "Doğuş Çay"],
    campaign: {
      badge: "Market",
      title: "Haftalık Market Fırsatları",
      subtitle: "150 TL üzeri alışverişte kargo bedava",
    },
  },
  {
    id: "kitap-kirtasiye",
    slug: "kitap-kirtasiye",
    name: "Kitap & Kırtasiye",
    icon: BookOpen,
    subcategories: [
      "Roman",
      "Kişisel Gelişim",
      "Çocuk Kitapları",
      "Okul & Ofis Kırtasiyesi",
      "Defter & Not Defteri",
      "Sanat Malzemeleri",
    ],
    brands: ["Can Yayınları", "İş Bankası Kültür Yayınları", "Faber-Castell", "Pilot", "Moleskine", "Doğan Kardeş"],
    campaign: {
      badge: "Kitap",
      title: "Okuma Kulübü",
      subtitle: "3 kitap al, en ucuzu hediye",
    },
  },
  {
    id: "oto-motosiklet",
    slug: "oto-motosiklet",
    name: "Oto & Motosiklet",
    icon: Car,
    subcategories: [
      "Oto Aksesuar",
      "Oto Bakım & Kimyasal",
      "Lastik & Jant",
      "Motosiklet Ekipmanları",
      "Oto Elektroniği",
      "Yedek Parça",
    ],
    brands: ["Bosch", "Mobil", "Michelin", "Castrol", "Petek", "Total"],
    campaign: {
      badge: "Oto",
      title: "Bakım Zamanı",
      subtitle: "Oto bakım ürünlerinde %25 indirim",
    },
  },
];

/** "Diğer Kategoriler" panelinde gösterilen ek kategoriler. */
export const extraCategories: ExtraCategory[] = [
  { id: "telefon-aksesuar", slug: "telefon-aksesuar", name: "Telefon & Aksesuar", icon: Smartphone },
  { id: "bilgisayar-tablet", slug: "bilgisayar-tablet", name: "Bilgisayar & Tablet", icon: Laptop },
  { id: "ayakkabi-canta", slug: "ayakkabi-canta", name: "Ayakkabı & Çanta", icon: Footprints },
  { id: "saat-mucevher", slug: "saat-mucevher", name: "Saat & Mücevher", icon: Watch },
  { id: "evcil-hayvan", slug: "evcil-hayvan", name: "Evcil Hayvan", icon: PawPrint },
  { id: "yapi-market", slug: "yapi-market", name: "Yapı Market", icon: Hammer },
  { id: "hobi-oyuncak", slug: "hobi-oyuncak", name: "Hobi & Oyuncak", icon: Gamepad2 },
];

export function categoryHref(slug: string): string {
  return `/kategori/${slug}`;
}

/** Footer, mobil menü ve "Tüm Kategoriler" sayfası için düz liste. */
export const navCategories: NavCategory[] = [
  ...mainCategories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    href: categoryHref(category.slug),
  })),
  ...extraCategories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    href: categoryHref(category.slug),
  })),
];

export function findCategoryBySlug(slug: string) {
  const main = mainCategories.find((category) => category.slug === slug);
  if (main) return { kind: "main" as const, category: main };

  const extra = extraCategories.find((category) => category.slug === slug);
  if (extra) return { kind: "extra" as const, category: extra };

  return null;
}
