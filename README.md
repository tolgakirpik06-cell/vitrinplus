# VitrinPlus — Uçtan uca demo

Türkiye odaklı çok satıcılı pazaryeri **VitrinPlus**. Next.js 16 (App Router),
TypeScript ve Tailwind CSS v4 ile geliştirilmiş yerel demo.
Demo hesapları, mağaza başvurusu/onayı, satıcı ürünleri, sepet, ödeme simülasyonu,
sipariş takibi ve stok iadesi aynı tarayıcıda çalışır. Demo kayıtları
`localStorage` içinde kalır; hazır katalog `data/` dosyalarından gelir.
Gerçek kimlik doğrulama, backend, ödeme ve AI servisi bağlı değildir.

**Başlangıç:** [Demo rehberi](http://localhost:3000/demo).
Teslim kapsamı, sunum senaryosu ve canlı ürün planı: [DEMO-PLANI.md](DEMO-PLANI.md).

## Kurulum

> Node.js 20.9 veya üzeri gerekir.

```bash
npm install
npm run dev
```

Ardından tarayıcıda [http://localhost:3000](http://localhost:3000) adresini aç.

## Diğer komutlar

```bash
npm run build      # production build
npm run start      # build sonrası production sunucusu
npm run typecheck  # TypeScript hata kontrolü (tsc --noEmit)
npm run test:demo  # Sipariş, stok, kupon ve durum geçişi testleri
npm run lint       # ESLint
```

## Proje mimarisi

```
app/
  layout.tsx          Kök layout, font (Inter) ve metadata
  page.tsx             Ana sayfa (bölümleri birleştirir)
  globals.css          Tailwind v4 importu + tema tokenları (@theme)
  kategoriler/         "Yakında" placeholder sayfası
  favoriler/           "Yakında" placeholder sayfası
  sepet/               "Yakında" placeholder sayfası
  giris/                "Yakında" placeholder sayfası
  uye-ol/               "Yakında" placeholder sayfası
  satici-ol/            "Yakında" placeholder sayfası

components/
  layout/    Header, Logo, AiSearchBar, MobileNav, CategorySidebar,
             CategoryStrip (mobil/tablet kategori şeridi), Footer
  home/      Hero, ProductSection, ProductCard, StatsBar, SellerCta,
             PricingSection, PricingCard, PerksSection
  ui/        Button, Badge (AiTagBadge/Pill), RatingStars,
             RobotIllustration, StoreIllustration, ComingSoon

data/        Kategori, ürün, fiyat paketi, istatistik gibi statik mock veriler
types/       Paylaşılan TypeScript tipleri
lib/         Küçük yardımcı fonksiyonlar (cn, formatPrice)
```

### Neden bu yapı?

- **Server/Client ayrımı**: Sadece etkileşim gerektiren parçalar
  (`AiSearchBar`, `MobileNav`) `"use client"` — geri kalan her şey Server
  Component olarak kalıyor, bu da daha küçük JS bundle'ı ve daha hızlı ilk
  yükleme demek.
- **Veri / görünüm ayrımı**: Ürünler, kategoriler, fiyat paketleri gibi
  içerikler `data/` altında ayrı dosyalarda. Backend hazır olduğunda bu
  dosyaları bir API/DB çağrısıyla değiştirmek yeterli, component'lere
  dokunmaya gerek yok.
- **Tasarım tokenları tek yerde**: Marka rengi (turuncu), lacivert tonlar,
  radius ve gölge değerleri `app/globals.css` içinde `@theme` bloğunda
  tanımlı. Renk paletini değiştirmek tek dosyadan yapılabiliyor.

## Tasarım notları

- Görsel referans olarak verilen `reference.png` esas alındı: header (logo +
  AI arama + kategoriler + favoriler + sepet + giriş/üye/satıcı ol), koyu
  lacivert hero + robot illüstrasyonu, "AI Sana Özel Seçti" ürün kartları,
  istatistik şeridi, "%0 Komisyon" satıcı çağrısı, mağaza paketleri ve
  "VitrinPlus Ayrıcalıkları" bölümleri birebir bu sırayla uygulandı.
- Referanstaki sağ taraftaki mobil uygulama (telefon) mockup'ları bu MVP'nin
  kapsamı dışında bırakıldı — istenirse ayrı bir bölüm olarak eklenebilir.
- Robot ve mağaza görselleri, gerçek görsel/AI görsel üretimi olmadığı için
  özel olarak çizilmiş SVG illüstrasyonlardır; ürün görselleri de marka
  rengiyle uyumlu gradient + ikon placeholder'lardır. Gerçek ürün/satıcı
  görselleri bağlandığında `components/home/ProductCard.tsx` içindeki ikon
  alanının yerine `next/image` ile gerçek görsel konulabilir.
- Header'daki "Satıcı Ol", "Giriş Yap", "Üye Ol", "Favoriler", "Sepet" gibi
  linkler ve `AI Alışveriş Asistanı` kutusu şu an placeholder sayfalara veya
  henüz oluşturulmamış rotalara gidiyor; backend/auth eklendiğinde bu
  sayfaların gerçek karşılıkları yazılabilir.

## Responsive davranış

- **Mobil (< 768px)**: Header'da arama kutusu ikinci satıra iner, kategori
  sidebar'ı yerini yatay kaydırılabilir kategori şeridine bırakır, hamburger
  menü tüm navigasyonu (kategoriler, favoriler, sepet, giriş/üye/satıcı ol)
  bir çekmecede toplar. Ürün kartları 2 sütun.
- **Tablet (768–1024px)**: Arama kutusu header'a geri döner, ürün kartları 3
  sütun, kategori sidebar'ı hâlâ gizli (yatay şerit kullanılır).
- **Masaüstü (≥ 1024px)**: Sol kategori sidebar'ı görünür, ürün kartları 4–5
  sütun, alt bölüm (satıcı CTA + paketler + ayrıcalıklar) 3 sütunlu grid.

## Bu ortamdaki bir kısıt hakkında not

Bu proje, Claude'un bulut sandbox ortamında elle (npm install çalıştırmadan)
yazıldı çünkü bu oturumda `registry.npmjs.org`'a erişim organizasyon
politikası tarafından engellendi. Kod, TypeScript sözdizimi açısından
otomatik olarak tarandı ve tüm import/export eşleşmeleri elle doğrulandı;
yine de ilk `npm install` sonrası `npm run typecheck` ve `npm run build`
komutlarını çalıştırıp gözden geçirmen önerilir.
