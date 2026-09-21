# VitrinPlus — Demo Pazaryeri

Türkiye odaklı çok satıcılı pazaryeri **VitrinPlus**. Next.js 16 (App Router), React 19,
TypeScript ve Tailwind CSS v4 ile geliştirilmiş, **demo öncelikli** bir uygulamadır.
Demo hesabı, mağaza başvurusu/onayı, satıcı paneli, sepet, ödeme simülasyonu, sipariş
takibi ve stok yönetimi aynı tarayıcıda çalışır. Demo kayıtları `localStorage` içinde tutulur.

**Aşama 2 ile iki çalışma modu vardır:** `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY`
boşsa uygulama yukarıdaki demo modunda çalışır. Doldurulursa hesap, satıcı başvurusu, ürün, stok, sipariş,
iade, soru-cevap ve kazanç kayıtları Supabase'de tutulur (kurulum: [supabase/README.md](supabase/README.md)).
Ödeme sağlayıcısı, kargo, e-fatura ve yapay zekâ servisi **bağlı değildir**; kod ileride bunlar
bağlanabilecek şekilde ayrıştırılmıştır.

**Başlangıç:** [Demo rehberi](http://localhost:3000/demo) ·
Teslim kapsamı ve sunum senaryosu: [DEMO-PLANI.md](DEMO-PLANI.md)

## Kurulum

> Node.js 20.9 veya üzeri gerekir.

```bash
npm install
npm run dev
```

## Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test:demo  # sipariş, stok, kupon ve durum geçişi testleri
```

## Satıcı Paneli (`/satici-panel`)

Her bölüm kendi rotasına sahiptir ve ortak bir panel kabuğunu (kenar çubuğu + üst çubuk) kullanır.

| Rota | Bölüm |
| --- | --- |
| `/satici-panel` | Genel Bakış (KPI, satış grafiği, yapılacaklar, sağlık, son siparişler, Vitrin AI önerileri) |
| `/satici-panel/siparisler` | Siparişler: durum kartları, toplu hazırla → etiket → yazdır → kargoya ver, sağ detay çekmecesi |
| `/satici-panel/urunler`, `/urunler/yeni`, `/urunler/[id]` | Ürün listesi, Ürün Ekle/Düzenle + canlı kâr hesaplayıcı, toplu işlemler, CSV içe/dışa aktarma |
| `/satici-panel/stok` | Stok Yönetimi: site içi toplu stok güncelleme, kritik seviye, stok hareketleri |
| `/satici-panel/kampanyalar`, `/reklam` | Kampanyalar (Plus+), reklam ürünleri ve fiyat hesaplama |
| `/satici-panel/kazanclar`, `/odemeler`, `/iadeler` | Net hakediş, ödeme takvimi, iptaller |
| `/satici-panel/analizler` | Satış, kâr analizi (maliyet düzenleme), envanter |
| `/satici-panel/sorular`, `/magazam`, `/paketim`, `/ayarlar` | Müşteri soruları, mağaza bilgileri, paket yönetimi, kargo/demo verisi |

Boş bir mağaza için Ayarlar veya boş durum ekranlarından **“Örnek Veri Yükle”** kullanılabilir;
yalnızca örnek olarak işaretli kayıtlar kaldırılır, kullanıcı verisine dokunulmaz.

## Mimari

```
app/                  Rotalar (sunucu bileşenleri; sayfalar ince, istemci bileşenlerini çağırır)
components/
  dashboard/          Ortak panel bileşenleri (DashboardShell, Sidebar, DataTable, DetailDrawer,
                      StatCard, Tabs, Modal, UpgradeLock, grafikler …)
  seller/             Satıcı paneline özel ekranlar (orders, products, stock, pages, overview)
  demo/               DemoProvider (localStorage tabanlı demo durumu) ve müşteri demo ekranları
lib/
  demo-marketplace.ts Saf iş kuralları (sipariş, stok düşümü, durum geçişi) — testlenir
  plans.ts            Paket sistemi: TEK merkezi kaynak (fiyat, limit, özellik kilitleri)
  ad-pricing.ts       Reklam ürünleri ve başlangıç fiyatları
  profit.ts           Kâr / marj hesabı
  seller-analytics.ts Sipariş, stok, kazanç türetmeleri (saf fonksiyonlar)
  seller-ops.ts       Satıcıya ait ek veriler (kargo etiketi, takip no, stok hareketi, paket seçimi)
  storage-migration.ts localStorage anahtarları ve eski (pazarbuy) anahtardan güvenli taşıma
```

### Paketler

`lib/plans.ts` içinde tanımlıdır; başka yerde fiyat yazılmaz. Tüm paketlerde %0 komisyon ve
sınırsız sipariş vardır. Ek ürün kapasitesi fiyatları **henüz belirlenmemiştir**; arayüzde
“Fiyat daha sonra belirlenecek” yazar.

### Depolama

| Anahtar | İçerik |
| --- | --- |
| `vitrinplus-demo-v1` | Kullanıcılar, mağazalar, ürünler, siparişler |
| `vitrinplus-seller-ops-v1` | Satıcı operasyon verisi (kargo, notlar, stok hareketleri, paket) |
| `vitrinplus-questions-v1` | “Satıcıya Sor” soruları |
| `vitrinplus-cart` | Sepet |

Eski `pazarbuy-*` anahtarları silinmez; ilk okumada yeni anahtara taşınır.

### Güvenlik ilkeleri

- Ürün maliyeti ve kâr yalnızca satıcı panelinde görünür; müşteri tarafına giden ürüne
  (`shopProduct`) hiçbir zaman geçmez.
- Panelde uydurma performans/reklam rakamı gösterilmez; veri yoksa “—” ve açıklama görünür.

## Bu aşamada olmayanlar

Müşteri hesap alt sayfaları, müşteri iade akışı, tam soru–cevap yayını, detaylı kazanç/ödeme
raporları, tam kampanya/reklam yayını, admin paneli ve gerçek entegrasyonlar sonraki aşamalardadır.
