import type {
  AiTagType,
  Product,
  ProductSpec,
  ProductVariantGroup,
  ProductVisualKey,
} from "@/types";
import type { IconName } from "@/lib/icon-map";
import { products as curatedProducts } from "@/data/products";

// NOT: icon alanı artık gerçek ikon component referansı değil,
// serileştirilebilir bir isim (IconName) tutuyor — bu ürün verisi Server
// Component'lerden "use client" bileşenlere (ör. FeaturedCarousel) prop
// olarak geçebiliyor ve React fonksiyon değerlerini bu şekilde
// serileştiremiyor. Gerçek ikon, yalnızca render anında lib/icon-map.ts
// üzerinden çözülüyor.
type Variant = { template: string; visual: ProductVisualKey; icon?: IconName };
type CategoryCatalog = {
  name: string;
  brands: string[];
  priceRange: [number, number];
  variants: Variant[];
  variantGroups?: ProductVariantGroup[];
  extraSpecs?: ProductSpec[];
};

const CATALOG: Record<string, CategoryCatalog> = {
  kadin: {
    name: "Kadın",
    // Her varyant, kategori sayfasındaki alt kategori filtresiyle (Elbise, Ceket & Mont, vb.)
    // birebir eşleşecek anahtar kelimeyi içerir — böylece hangi alt kategori seçilirse
    // seçilsin gerçekten o alt kategoriye ait, farklı ürünler listelenir.
    brands: ["Koton", "LC Waikiki", "Mavi", "DeFacto", "Vakko", "Network"],
    priceRange: [150, 1200],
    variants: [
      { template: "{brand} Kadın Örme Elbise", visual: "generic", icon: "shirt" }, // Elbise
      { template: "{brand} Kadın Blazer Ceket", visual: "generic", icon: "shirt" }, // Ceket & Mont
      { template: "{brand} Kadın Saten Gömlek", visual: "generic", icon: "shirt" }, // Bluz & Gömlek
      { template: "{brand} Kadın Yüksek Bel Kot Pantolon", visual: "generic", icon: "shirt" }, // Pantolon & Jean
      { template: "{brand} Kadın Midi Etek", visual: "generic", icon: "shirt" }, // Etek
      { template: "{brand} Kadın Topuklu Ayakkabı", visual: "sneaker" }, // Ayakkabı
      { template: "{brand} Kadın Omuz Çantası", visual: "generic", icon: "shopping-bag" }, // Çanta
      { template: "{brand} Kadın İç Giyim Seti", visual: "generic", icon: "shirt" }, // İç Giyim
    ],
    variantGroups: [
      { type: "beden", label: "Beden", options: ["XS", "S", "M", "L", "XL"] },
      { type: "renk", label: "Renk", options: ["Siyah", "Beyaz", "Bej", "Lacivert", "Kırmızı"] },
    ],
    extraSpecs: [
      { label: "Kumaş", value: "%100 Pamuk Karışım" },
      { label: "Yıkama", value: "30°C Makine Yıkama" },
    ],
  },
  erkek: {
    name: "Erkek",
    brands: ["Koton", "LC Waikiki", "Mavi", "DeFacto", "Kigili", "Network"],
    priceRange: [150, 1500],
    variants: [
      { template: "{brand} Erkek Basic Tişört", visual: "generic", icon: "shirt" }, // Tişört
      { template: "{brand} Erkek Slim Fit Gömlek", visual: "generic", icon: "shirt" }, // Gömlek
      { template: "{brand} Erkek Şık Ceket", visual: "generic", icon: "shirt" }, // Ceket & Mont
      { template: "{brand} Erkek Chino Pantolon", visual: "generic", icon: "shirt" }, // Pantolon
      { template: "{brand} Erkek Spor Ayakkabı", visual: "sneaker" }, // Ayakkabı
      { template: "{brand} Erkek Deri Kemer Aksesuar Seti", visual: "generic", icon: "shopping-bag" }, // Aksesuar
      { template: "{brand} Erkek İç Giyim Seti", visual: "generic", icon: "shirt" }, // İç Giyim
      { template: "{brand} Erkek Spor Giyim Eşofman Takımı", visual: "generic", icon: "dumbbell" }, // Spor Giyim
    ],
    variantGroups: [
      { type: "beden", label: "Beden", options: ["S", "M", "L", "XL", "XXL"] },
      { type: "renk", label: "Renk", options: ["Siyah", "Lacivert", "Gri", "Haki", "Kahverengi"] },
    ],
    extraSpecs: [
      { label: "Kumaş", value: "Polyester Karışım" },
      { label: "Yıkama", value: "30°C Makine Yıkama" },
    ],
  },
  "anne-cocuk": {
    name: "Anne & Çocuk",
    brands: ["Chicco", "Sütaş Bebe", "Prima", "LC Waikiki Baby", "Mothercare", "Zeynep Kids"],
    priceRange: [80, 900],
    variants: [
      { template: "{brand} Bebek Bezi Paketi", visual: "generic", icon: "baby" }, // Bebek Bezi & Islak Mendil
      { template: "{brand} Bebek Giyim Seti", visual: "generic", icon: "baby" }, // Bebek Giyim
      { template: "{brand} Eğitici Oyuncak Seti", visual: "generic", icon: "gamepad2" }, // Oyuncak
      { template: "{brand} Mama Beslenme Seti", visual: "generic", icon: "baby" }, // Mama & Beslenme
      { template: "{brand} Puset Ana Kucağı Aksesuarı", visual: "generic", icon: "baby" }, // Puset & Ana Kucağı
      { template: "{brand} Çocuk Giyim Seti", visual: "generic", icon: "shirt" }, // Çocuk Giyim
    ],
    variantGroups: [
      { type: "beden", label: "Yaş / Beden", options: ["0-3 Ay", "3-6 Ay", "1-2 Yaş", "3-4 Yaş", "5-6 Yaş"] },
    ],
    extraSpecs: [
      { label: "Malzeme", value: "Alerjik Olmayan, Nefes Alabilir Kumaş" },
      { label: "Güvenlik", value: "TSE ve CE Sertifikalı" },
    ],
  },
  "ev-yasam": {
    name: "Ev & Yaşam",
    brands: ["Bosch", "Arçelik", "English Home", "Madame Coco", "Karaca", "Tefal"],
    priceRange: [100, 6000],
    variants: [
      { template: "{brand} Oturma Odası Mobilyası", visual: "generic", icon: "home" }, // Mobilya
      { template: "{brand} Dekorasyon Ürünü", visual: "generic", icon: "home" }, // Dekorasyon
      { template: "{brand} Mutfak Gereçleri Seti", visual: "generic", icon: "utensils-crossed" }, // Mutfak Gereçleri
      { template: "{brand} Nevresim Takımı", visual: "generic", icon: "home" }, // Nevresim Takımı
      { template: "{brand} Aydınlatma Ürünü", visual: "generic", icon: "lamp" }, // Aydınlatma
      { template: "{brand} Banyo Tekstili Seti", visual: "generic", icon: "droplet" }, // Banyo Tekstili
      { template: "{brand} Küçük Ev Aletleri Seti", visual: "vacuum" }, // Küçük Ev Aletleri
    ],
    extraSpecs: [{ label: "Malzeme", value: "Dayanıklı Ev Tipi Malzeme" }],
  },
  elektronik: {
    name: "Elektronik",
    brands: ["Samsung", "Apple", "Xiaomi", "Sony", "LG", "Huawei"],
    priceRange: [500, 55000],
    variants: [
      { template: "{brand} Akıllı Telefon Pro", visual: "phone" }, // Telefon
      { template: "{brand} Tablet 128GB", visual: "tablet" }, // Bilgisayar & Tablet
      { template: "{brand} 4K Televizyon", visual: "generic", icon: "tv" }, // Televizyon
      { template: "{brand} Kablosuz Kulaklık", visual: "headphones" }, // Kulaklık & Ses
      { template: "{brand} Akıllı Saat", visual: "watch" }, // Akıllı Saat
      { template: "{brand} Beyaz Eşya Ürünü", visual: "generic", icon: "sparkles" }, // Beyaz Eşya
      { template: "{brand} Oyun Konsolu", visual: "gaming-pc" }, // Oyun & Konsol
    ],
    variantGroups: [
      { type: "hafiza", label: "Hafıza", options: ["128GB", "256GB", "512GB"] },
      { type: "renk", label: "Renk", options: ["Siyah", "Gümüş", "Mavi"] },
    ],
    extraSpecs: [
      { label: "Garanti", value: "2 Yıl Resmi Distribütör Garantisi" },
      { label: "Bağlantı", value: "Bluetooth 5.3 / Wi-Fi 6" },
    ],
  },
  kozmetik: {
    name: "Kozmetik",
    brands: ["L'Oréal", "Flormar", "The Ordinary", "Nivea", "Maybelline", "Golden Rose"],
    priceRange: [60, 900],
    variants: [
      { template: "{brand} Cilt Bakımı Serumu", visual: "generic", icon: "droplet" }, // Cilt Bakımı
      { template: "{brand} Makyaj Seti", visual: "generic", icon: "sparkles" }, // Makyaj
      { template: "{brand} Parfüm 100ml", visual: "perfume" }, // Parfüm
      { template: "{brand} Saç Bakımı Seti", visual: "generic", icon: "droplet" }, // Saç Bakımı
      { template: "{brand} Kişisel Bakım Seti", visual: "generic", icon: "sparkles" }, // Kişisel Bakım
      { template: "{brand} Erkek Bakım Seti", visual: "generic", icon: "sparkles" }, // Erkek Bakım
    ],
    extraSpecs: [
      { label: "İçerik", value: "Dermatolojik Olarak Test Edilmiştir" },
      { label: "Kullanım", value: "Tüm Cilt Tipleri İçin Uygun" },
    ],
  },
  "spor-outdoor": {
    name: "Spor & Outdoor",
    brands: ["Nike", "Adidas", "Puma", "Decathlon", "New Balance", "Under Armour"],
    priceRange: [150, 2500],
    variants: [
      { template: "{brand} Koşu Ayakkabısı", visual: "sneaker" }, // Koşu
      { template: "{brand} Fitness Ekipmanları Seti", visual: "generic", icon: "dumbbell" }, // Fitness Ekipmanları
      { template: "{brand} Outdoor Kamp Çadırı", visual: "generic", icon: "dumbbell" }, // Outdoor & Kamp
      { template: "{brand} Bisiklet", visual: "generic", icon: "bike" }, // Bisiklet
      { template: "{brand} Spor Giyim Eşofman Takımı", visual: "generic", icon: "dumbbell" }, // Spor Giyim
      { template: "{brand} Spor Ayakkabı Modeli", visual: "sneaker" }, // Spor Ayakkabı
    ],
    variantGroups: [
      { type: "beden", label: "Beden", options: ["S", "M", "L", "XL"] },
      { type: "renk", label: "Renk", options: ["Siyah", "Gri", "Lacivert"] },
    ],
    extraSpecs: [{ label: "Malzeme", value: "Nefes Alabilir Teknik Kumaş" }],
  },
  supermarket: {
    name: "Süpermarket",
    brands: ["Ülker", "Eti", "Pınar", "Torku", "Sütaş", "Dardanel"],
    priceRange: [20, 350],
    variants: [
      { template: "{brand} Temel Gıda Seti", visual: "generic", icon: "shopping-basket" }, // Temel Gıda
      { template: "{brand} İçecek Paketi (6'lı)", visual: "generic", icon: "coffee" }, // İçecek
      { template: "{brand} Atıştırmalık Kutusu", visual: "generic", icon: "shopping-basket" }, // Atıştırmalık
      { template: "{brand} Temizlik Ürünü Seti", visual: "generic", icon: "droplet" }, // Temizlik
      { template: "{brand} Kişisel Bakım Paketi", visual: "generic", icon: "shopping-basket" }, // Kişisel Bakım
      { template: "{brand} Kahvaltılık Ürün Paketi", visual: "generic", icon: "coffee" }, // Kahvaltılık
    ],
    extraSpecs: [{ label: "Son Kullanma", value: "Üretimden İtibaren 12 Ay" }],
  },
  "kitap-kirtasiye": {
    name: "Kitap & Kırtasiye",
    brands: ["İş Bankası Kültür", "Can Yayınları", "Faber-Castell", "Pilot", "Doğan Kitap", "Morfoss"],
    priceRange: [40, 450],
    variants: [
      { template: "{brand} Roman Seti", visual: "generic", icon: "book-open" }, // Roman
      { template: "{brand} Kişisel Gelişim Kitabı", visual: "generic", icon: "book-open" }, // Kişisel Gelişim
      { template: "{brand} Çocuk Kitapları Seti", visual: "generic", icon: "book-open" }, // Çocuk Kitapları
      { template: "{brand} Okul Kırtasiye Seti", visual: "generic", icon: "book-open" }, // Okul & Ofis Kırtasiyesi
      { template: "{brand} Not Defteri Seti", visual: "generic", icon: "book-open" }, // Defter & Not Defteri
      { template: "{brand} Sanat Malzemeleri Seti", visual: "generic", icon: "book-open" }, // Sanat Malzemeleri
    ],
    extraSpecs: [{ label: "Kağıt Türü", value: "1. Hamur Kağıt" }],
  },
  "oto-motosiklet": {
    name: "Oto & Motosiklet",
    brands: ["Bosch", "Michelin", "Castrol", "Mannol", "Osram", "Petlas"],
    priceRange: [80, 2500],
    variants: [
      { template: "{brand} Oto Aksesuar Seti", visual: "generic", icon: "car" }, // Oto Aksesuar
      { template: "{brand} Oto Bakım Kimyasalı", visual: "generic", icon: "droplet" }, // Oto Bakım & Kimyasal
      { template: "{brand} Lastik ve Jant Seti", visual: "generic", icon: "car" }, // Lastik & Jant
      { template: "{brand} Motosiklet Ekipmanları Seti", visual: "generic", icon: "bike" }, // Motosiklet Ekipmanları
      { template: "{brand} Oto Elektroniği Ürünü", visual: "generic", icon: "car" }, // Oto Elektroniği
      { template: "{brand} Yedek Parça Seti", visual: "generic", icon: "hammer" }, // Yedek Parça
    ],
    extraSpecs: [{ label: "Uyumluluk", value: "Evrensel Uyumlu" }],
  },
  "telefon-aksesuar": {
    name: "Telefon & Aksesuar",
    brands: ["Anker", "Baseus", "Spigen", "Ugreen", "Belkin", "Ttec"],
    priceRange: [50, 800],
    variants: [
      { template: "{brand} Telefon Kılıfı", visual: "generic", icon: "smartphone" },
      { template: "{brand} Ekran Koruyucu Seti", visual: "generic", icon: "smartphone" },
      { template: "{brand} Hızlı Şarj Adaptörü", visual: "generic", icon: "smartphone" },
      { template: "{brand} Kablosuz Şarj Standı", visual: "generic", icon: "smartphone" },
      { template: "{brand} Powerbank 20000mAh", visual: "generic", icon: "smartphone" },
      { template: "{brand} USB-C Kablo Seti", visual: "generic", icon: "smartphone" },
    ],
    variantGroups: [{ type: "renk", label: "Renk", options: ["Siyah", "Şeffaf", "Mavi", "Kırmızı"] }],
    extraSpecs: [{ label: "Uyumluluk", value: "Çoklu Model Uyumlu" }],
  },
  "bilgisayar-tablet": {
    name: "Bilgisayar & Tablet",
    brands: ["Apple", "Samsung", "Lenovo", "Asus", "HP", "Dell"],
    priceRange: [2000, 45000],
    variants: [
      { template: "{brand} Ultrabook 14\"", visual: "laptop" },
      { template: "{brand} Oyuncu Dizüstü Bilgisayar", visual: "laptop" },
      { template: "{brand} Tablet 11\"", visual: "tablet" },
      { template: "{brand} 2'si 1 Arada Dizüstü", visual: "laptop" },
      { template: "{brand} Kablosuz Klavye Mouse Seti", visual: "generic", icon: "laptop" },
      { template: "{brand} Monitör 27\"", visual: "generic", icon: "laptop" },
    ],
    variantGroups: [
      { type: "hafiza", label: "Depolama", options: ["256GB", "512GB", "1TB"] },
      { type: "renk", label: "Renk", options: ["Uzay Grisi", "Gümüş"] },
    ],
    extraSpecs: [{ label: "Garanti", value: "2 Yıl Resmi Distribütör Garantisi" }],
  },
  "ayakkabi-canta": {
    name: "Ayakkabı & Çanta",
    brands: ["Nike", "Puma", "Derimod", "Deichmann", "Beta Ayakkabı", "Vakko"],
    priceRange: [300, 3500],
    variants: [
      { template: "{brand} Günlük Sneaker", visual: "sneaker" },
      { template: "{brand} Klasik Deri Ayakkabı", visual: "sneaker" },
      { template: "{brand} Kadın El Çantası", visual: "generic", icon: "footprints" },
      { template: "{brand} Sırt Çantası", visual: "generic", icon: "footprints" },
      { template: "{brand} Spor Çanta", visual: "generic", icon: "footprints" },
      { template: "{brand} Cüzdan", visual: "generic", icon: "footprints" },
    ],
    variantGroups: [
      { type: "beden", label: "Beden", options: ["36", "37", "38", "39", "40", "41", "42"] },
      { type: "renk", label: "Renk", options: ["Siyah", "Beyaz", "Kahverengi"] },
    ],
    extraSpecs: [{ label: "Taban", value: "Kaymaz Kauçuk Taban" }],
  },
  "saat-mucevher": {
    name: "Saat & Mücevher",
    brands: ["Casio", "Fossil", "Michael Kors", "Atasay", "Swatch", "Guess"],
    priceRange: [200, 15000],
    variants: [
      { template: "{brand} Klasik Kol Saati", visual: "watch" },
      { template: "{brand} Akıllı Saat", visual: "watch" },
      { template: "{brand} Gümüş Kolye", visual: "generic", icon: "watch" },
      { template: "{brand} Altın Kaplama Bileklik", visual: "generic", icon: "watch" },
      { template: "{brand} Küpe Seti", visual: "generic", icon: "watch" },
      { template: "{brand} Erkek Spor Saat", visual: "watch" },
    ],
    variantGroups: [
      { type: "renk", label: "Renk", options: ["Altın", "Gümüş", "Siyah"] },
      { type: "model", label: "Model", options: ["Klasik", "Spor", "Deri Kordon"] },
    ],
    extraSpecs: [{ label: "Su Direnci", value: "5 ATM" }],
  },
  "evcil-hayvan": {
    name: "Evcil Hayvan",
    brands: ["Royal Canin", "Purina", "Pro Plan", "Whiskas", "Trixie", "Ferplast"],
    priceRange: [60, 700],
    variants: [
      { template: "{brand} Kedi Maması 2kg", visual: "generic", icon: "paw-print" },
      { template: "{brand} Köpek Maması 3kg", visual: "generic", icon: "paw-print" },
      { template: "{brand} Evcil Hayvan Yatağı", visual: "generic", icon: "paw-print" },
      { template: "{brand} Tasma ve Kayış Seti", visual: "generic", icon: "paw-print" },
      { template: "{brand} Kedi Kumu 10L", visual: "generic", icon: "paw-print" },
      { template: "{brand} Evcil Hayvan Taşıma Çantası", visual: "generic", icon: "paw-print" },
    ],
    extraSpecs: [{ label: "Uygun Tür", value: "Kedi & Köpek" }],
  },
  "yapi-market": {
    name: "Yapı Market",
    brands: ["Bosch", "Makita", "Dewalt", "Filli Boya", "Bostik", "Şahin"],
    priceRange: [80, 3500],
    variants: [
      { template: "{brand} Akülü Matkap", visual: "generic", icon: "hammer" },
      { template: "{brand} El Aleti Seti", visual: "generic", icon: "hammer" },
      { template: "{brand} İç Cephe Boyası 15L", visual: "generic", icon: "hammer" },
      { template: "{brand} Merdiven 3 Basamak", visual: "generic", icon: "hammer" },
      { template: "{brand} Bahçe Hortumu Seti", visual: "generic", icon: "hammer" },
      { template: "{brand} Elektrikli Testere", visual: "generic", icon: "hammer" },
    ],
    extraSpecs: [{ label: "Kullanım Alanı", value: "İç ve Dış Mekan" }],
  },
  "hobi-oyuncak": {
    name: "Hobi & Oyuncak",
    brands: ["Lego", "Hasbro", "Mattel", "Faber-Castell", "Nerf", "Play-Doh"],
    priceRange: [100, 1800],
    variants: [
      { template: "{brand} Yapı Seti", visual: "generic", icon: "gamepad2" },
      { template: "{brand} Kutu Oyunu", visual: "generic", icon: "gamepad2" },
      { template: "{brand} Uzaktan Kumandalı Araç", visual: "generic", icon: "gamepad2" },
      { template: "{brand} Puzzle 1000 Parça", visual: "generic", icon: "gamepad2" },
      { template: "{brand} Hobi Boyama Seti", visual: "generic", icon: "gamepad2" },
      { template: "{brand} Aksiyon Figürü", visual: "generic", icon: "gamepad2" },
    ],
    extraSpecs: [{ label: "Yaş Aralığı", value: "3+ Yaş" }],
  },
};

const AI_TAGS: { type: AiTagType; label: string }[] = [
  { type: "price", label: "En İyi Fiyat" },
  { type: "delivery", label: "En Hızlı Teslimat" },
  { type: "rating", label: "En Yüksek Puan" },
  { type: "smart", label: "En Mantıklı Seçim" },
];

const SHIPPING = [
  { label: "Hızlı Teslimat", variant: "fast" as const },
  { label: "Ücretsiz Kargo", variant: "free" as const },
  { label: "Standart Kargo", variant: "standard" as const },
];

const IMAGE_VIEWS = ["on-gorunum", "detay-gorunum", "yan-gorunum", "kullanim-ani"];

const DESCRIPTION_TEMPLATES: ((name: string, brand: string, category: string) => string)[] = [
  (name, brand, category) =>
    `${brand} güvencesiyle üretilen ${name}, ${category.toLowerCase()} kategorisinde kalite ve performansı bir araya getiriyor. Günlük kullanımda uzun ömürlü ve konforlu bir deneyim sunar.`,
  (name, brand, category) =>
    `${name}, ${brand} kalitesini VitrinPlus güvencesiyle sizlere ulaştırıyor. Özenle seçilmiş malzemesi ve modern tasarımıyla ${category.toLowerCase()} alışverişinizde fark yaratır.`,
  (name, brand) =>
    `${brand} imzalı ${name}, hem işlevselliği hem de şık tasarımıyla dikkat çekiyor. Hızlı kargo ve satıcı garantisiyle güvenle sipariş verebilirsiniz.`,
  (name, brand, category) =>
    `${name} modeli, ${brand} markasının ${category.toLowerCase()} kategorisindeki deneyimini yansıtıyor. Binlerce mutlu müşterinin tercih ettiği ürünler arasında yer alıyor.`,
];

function slugSeed(slug: string): number {
  let seed = 0;
  for (let i = 0; i < slug.length; i += 1) seed += slug.charCodeAt(i) * (i + 1);
  return seed;
}

function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

export function getCategoryCatalog(slug: string): CategoryCatalog | null {
  return CATALOG[slug] ?? null;
}

export function generateCategoryProducts(slug: string, count = 18): Product[] {
  const catalog = CATALOG[slug];
  if (!catalog) return [];
  const seed = slugSeed(slug);
  const [minPrice, maxPrice] = catalog.priceRange;
  const range = Math.max(maxPrice - minPrice, 1);

  return Array.from({ length: count }, (_, i) => {
    const variant = catalog.variants[i % catalog.variants.length];
    const brand = catalog.brands[(i + Math.floor(i / catalog.variants.length)) % catalog.brands.length];
    const name = variant.template.replace("{brand}", brand);
    const price = Math.max(minPrice, roundToTen(minPrice + ((i * 257 + seed) % range)));
    const hasDiscount = i % 3 === 0;
    const oldPrice = hasDiscount ? roundToTen(price * 1.28) : undefined;
    const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;
    const rating = Math.round((4.1 + ((i * 3 + seed) % 9) * 0.1) * 10) / 10;
    const reviewCount = 30 + ((i * 47 + seed * 13) % 970);
    const shipping = SHIPPING[i % SHIPPING.length];
    const aiTag = AI_TAGS[i % AI_TAGS.length];
    const seller = i % 3 === 0 ? `${brand} Resmi Mağaza` : `${brand} Store`;
    const id = `${slug}-${i}`;

    const stockRaw = (i * 11 + seed * 3) % 45;
    const stock = i % 9 === 0 ? 0 : stockRaw + 1;

    const images = IMAGE_VIEWS.map((view) => `${variant.visual}:${view}`);

    const description = DESCRIPTION_TEMPLATES[i % DESCRIPTION_TEMPLATES.length](name, brand, catalog.name);

    const stockCode = `VP-${slug.toUpperCase()}-${i.toString().padStart(3, "0")}`;
    const warranty = i % 4 === 0 ? "2 Yıl Resmi Garanti" : "1 Yıl Satıcı Garantisi";
    const origin = i % 5 === 0 ? "İthal" : "Yerli Üretim";

    const specifications: ProductSpec[] = [
      { label: "Marka", value: brand },
      { label: "Kategori", value: catalog.name },
      { label: "Stok Kodu", value: stockCode },
      { label: "Garanti", value: warranty },
      { label: "Menşei", value: origin },
      ...(catalog.extraSpecs ?? []),
    ];

    return {
      id,
      slug: id,
      name,
      brand,
      category: catalog.name,
      price,
      oldPrice,
      discount,
      rating,
      reviewCount,
      seller,
      stock,
      shipping,
      aiTag,
      visual: variant.visual,
      icon: variant.icon,
      images,
      description,
      specifications,
      variants: catalog.variantGroups,
      tags: [],
    } satisfies Product;
  });
}

const REVIEW_AUTHORS = [
  "Ayşe K.",
  "Mehmet Y.",
  "Elif D.",
  "Can T.",
  "Zeynep A.",
  "Burak S.",
  "Deniz M.",
  "Selin R.",
];

const REVIEW_COMMENTS = [
  "Ürün açıklamada belirtildiği gibi geldi, kargo da hızlıydı.",
  "Kalitesinden çok memnun kaldım, tekrar alırım.",
  "Fiyatına göre performansı gayet iyi, tavsiye ederim.",
  "Paketleme özenliydi, ürün hiç hasar almadan elime ulaştı.",
  "Beklentimin biraz altında ama yine de kullanışlı bir ürün.",
  "Satıcı ile iletişim çok iyiydi, sorularıma hızlı cevap verdiler.",
];

export type SampleReview = {
  author: string;
  comment: string;
  rating: number;
  daysAgo: number;
};

/**
 * Ürüne özel deterministik (rastgele olmayan) örnek yorumlar üretir.
 * Gerçek bir yorum sistemi olmadığından ürünün puanına yakın, tutarlı
 * sonuçlar veren sahte ama gerçekçi yorumlar gösterir.
 */
export function getSampleReviews(product: Product, count = 4): SampleReview[] {
  const seed = slugSeed(product.slug);
  return Array.from({ length: count }, (_, i) => {
    const author = REVIEW_AUTHORS[(seed + i * 7) % REVIEW_AUTHORS.length];
    const comment = REVIEW_COMMENTS[(seed + i * 11) % REVIEW_COMMENTS.length];
    const rating = Math.max(3, Math.min(5, Math.round(product.rating) - (i % 2)));
    const daysAgo = 3 + ((seed + i * 13) % 40);
    return { author, comment, rating, daysAgo };
  });
}

/**
 * Verilen ürünle aynı kategoriden benzer ürünleri getirir. Ürün, kategori
 * mock üretecinden geliyorsa aynı kategoriden yeniden üretilir; elle
 * hazırlanmış (curated) bir ürünse aynı kategori etiketine sahip diğer
 * curated ürünler kullanılır. `offset` aynı üründen farklı iki liste
 * (ör. "Benzer Ürünler" ve "Bunlara da Baktı") üretmek için kullanılır.
 */
export function getRelatedProducts(current: Product, limit = 6, offset = 0): Product[] {
  for (const key of Object.keys(CATALOG)) {
    const prefix = `${key}-`;
    if (current.slug.startsWith(prefix) && /^\d+$/.test(current.slug.slice(prefix.length))) {
      const pool = generateCategoryProducts(key, Math.max(limit + offset + 1, 14));
      const others = pool.filter((p) => p.slug !== current.slug);
      return others.slice(offset, offset + limit);
    }
  }

  const sameCategory = curatedProducts.filter(
    (p) => p.slug !== current.slug && p.category === current.category
  );
  const rest = curatedProducts.filter(
    (p) => p.slug !== current.slug && p.category !== current.category
  );
  return [...sameCategory, ...rest].slice(offset, offset + limit);
}

/**
 * Verilen slug'a karşılık gelen ürünü bulur. Önce elle hazırlanmış
 * (curated) ürünlerde arar, bulamazsa slug'ı `${kategori}-${index}`
 * kalıbı olarak çözüp ilgili kategoriyi deterministik biçimde yeniden
 * üretir. Böylece tüm ürün verisi tek bir kaynaktan (bu dosya + data/products.ts)
 * gelir, hiçbir sayfa ürün bilgisini elle tekrar yazmaz.
 */
export function getProductBySlug(slug: string): Product | null {
  const curated = curatedProducts.find((product) => product.slug === slug);
  if (curated) return curated;

  for (const key of Object.keys(CATALOG)) {
    const prefix = `${key}-`;
    if (!slug.startsWith(prefix)) continue;
    const indexPart = slug.slice(prefix.length);
    if (!/^\d+$/.test(indexPart)) continue;
    const index = Number(indexPart);
    const generated = generateCategoryProducts(key, index + 1);
    const product = generated[index];
    if (product) return product;
  }

  return null;
}
