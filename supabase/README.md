# VitrinPlus — Supabase kurulumu (Aşama 2)

Bu klasör gerçek pazaryeri veritabanını içerir. **Supabase bağlanmazsa** uygulama Aşama 1 demo
modunda (tarayıcı `localStorage`) çalışmaya devam eder; bu klasörü kullanmak zorunlu değildir.

```
supabase/
  migrations/   0001 … 0007  → sırayla çalıştırılacak SQL dosyaları
  tests/        yerel PostgreSQL üzerinde kural + eşzamanlılık testleri (Supabase'e dokunmaz)
```

> **Güvenlik:** Bu dosyada ve kaynak kodda hiçbir gizli anahtar yoktur. Anahtarları yalnızca
> `.env.local` dosyasına ve Supabase / Vercel panellerine gir. `.env.local` git'e eklenmez.

## 1. Proje oluştur

1. <https://supabase.com/dashboard> → **New project**. Bölge olarak sana yakın olanı seç.
2. Veritabanı şifresini bir şifre yöneticisinde sakla (uygulamaya yazılmaz).
3. **Project Settings → API** sayfasında `Project URL` ve `anon / publishable` anahtarını gör.

## 2. Migration'ları çalıştır

**SQL Editor → New query** ile aşağıdaki dosyaları **bu sırayla**, her birini ayrı ayrı yapıştırıp **Run** et.
Her biri hatasız bitmeden sonrakine geçme.

| # | Dosya | İçerik |
| --- | --- | --- |
| 1 | `0001_foundation.sql` | profiller, roller, satıcı hesapları, mağazalar, yardımcı fonksiyonlar |
| 2 | `0002_catalog.sql` | ürünler, görseller, varyantlar, ürün maliyetleri (ayrı tablo), favoriler, sepet, adresler |
| 3 | `0003_operations.sql` | siparişler, sipariş kalemleri (anlık kopya), stok hareketleri, iadeler, sorular, kazanç defteri, ödemeler |
| 4 | `0004_functions.sql` | `place_order`, `transition_order`, `adjust_stock`, `create_return`, `ask_question`, `plan_payout` vb. RPC'ler |
| 5 | `0005_rls_and_grants.sql` | Row Level Security politikaları ve sütun bazlı yetkiler |
| 6 | `0006_storage.sql` | `product-images`, `store-assets`, `avatars` kovaları ve politikaları |
| 7 | `0007_seller_documents.sql` | ÖZEL `seller-documents` kovası, `seller_documents` tablosu, belge kayıt RPC'si, yönetici başvuru kararı (`admin_review_seller_application`) |

Doğrulama: **Table Editor**'de tabloların geldiğini, **Authentication → Policies** altında
her tabloda RLS'nin açık olduğunu, **Storage** altında dört kovanın oluştuğunu kontrol et (`seller-documents` kovası **Private** olmalı; yanında “Public” etiketi görünmemeli).

## 3. Kimlik doğrulama (Authentication)

1. **Authentication → Sign In / Providers → Email**: etkin olsun. Üretimde **Confirm email** açık kalsın
   (kayıt sonrası kullanıcıya doğrulama e-postası gider).
2. **Authentication → URL Configuration**:
   - **Site URL:** sitenin adresi (yerelde `http://localhost:3000`).
   - **Redirect URLs:** `http://localhost:3000/auth/callback` ve yayın adresin için `https://<alan-adin>/auth/callback`.
3. **Google ile giriş (isteğe bağlı):**
   1. Google Cloud Console → *APIs & Services → Credentials → OAuth client ID (Web)*.
   2. *Authorized redirect URI* olarak Supabase'in **Authentication → Providers → Google** sayfasında yazan
      `https://<proje-ref>.supabase.co/auth/v1/callback` adresini ekle.
   3. Oluşan Client ID ve Client Secret'ı **yalnızca Supabase panelindeki Google ayarına** gir, sağlayıcıyı etkinleştir.
   4. `.env.local` içinde `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` yap.
4. **Apple ile giriş (isteğe bağlı, Apple Developer hesabı gerekir):** Supabase **Providers → Apple** sayfasındaki
   adımları izle; sonra `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` yap.
   Bayrak `true` olmadıkça giriş ekranındaki Google / Apple düğmeleri sahte giriş yapmaz; "henüz etkin değil" der.

## 4. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala:

| Değişken | Nereden | Not |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | herkese açık |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable | herkese açık; güvenlik RLS ile sağlanır |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` | `true` / boş | Google sağlayıcısı etkinleştirildikten sonra |
| `NEXT_PUBLIC_AUTH_APPLE_ENABLED` | `true` / boş | Apple sağlayıcısı etkinleştirildikten sonra |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role | **yalnızca sunucu**, RLS'yi aşar. Şu an hiçbir akış kullanmaz; gerekmedikçe boş bırak |

`NEXT_PUBLIC_` öneki olan değişkenler tarayıcıya gider; **service_role anahtarını asla `NEXT_PUBLIC_` ile adlandırma**.
Uygulama, service_role benzeri bir anahtar tarayıcı değişkenine yazılırsa Supabase'i devre dışı bırakıp demo moduna döner.

Değişkenleri değiştirdikten sonra `npm run dev` sunucusunu yeniden başlat. İki Supabase değişkeni de boşsa uygulama demo modundadır.

## 5. İlk yönetici hesabı

Yönetici rolü uygulama arayüzünden verilemez (yetki yükseltmeye karşı korunur). Önce sitede normal bir hesap aç, sonra
**SQL Editor**'de kendi e-postanla çalıştır:

```sql
update public.profiles set role = 'admin' where email = 'senin-epostan@ornek.com';
```

Ardından çıkış yapıp yeniden giriş yap. `/yonetim` ekranı satıcı başvurularını ve ödeme planlarını gösterir.

### Satıcı başvurusu inceleme akışı ve belgeler (0007)

- `/yonetim` listesindeki **Başvuruyu İncele** düğmesi `/yonetim/basvuru/<id>` ekranını açar: formda kaydedilen tüm bilgiler, yüklenen belgeler ve — sayfanın en altında — **Onayla / Reddet** kararı. Red için neden zorunludur; neden veritabanına yazılır ve satıcı `/satici-basvuru/durum` sayfasında görür.
- Karar yalnızca **bekleyen** başvuruya verilebilir; aynı başvuruya ikinci karar veritabanında reddedilir (`ALREADY_REVIEWED`).
- Belge dosyaları **özel** `seller-documents` kovasında `{kullanıcı_id}/{belge_türü}/{uuid}.{pdf|jpg|png}` yolunda durur. Herkese açık URL yoktur; yönetici ve satıcı belgeyi yalnızca **60 saniyelik imzalı adresle** açar. Satıcı yalnızca kendi klasörünü, yönetici tüm kovayı okur; yazma/silme yalnızca sahibine ve yalnızca bekleyen/reddedilmiş başvuruda açıktır.
- 0007'den **önce** gönderilmiş başvurularda dosya yoktur (form yalnızca dosya adı kaydediyordu). Yönetici bu belgeleri “Yüklenmedi” görür; satıcı `/satici-basvuru/durum` sayfasından yükleyebilir.

## 6. Uçtan uca deneme

1. İkinci bir hesapla kayıt ol → `/satici-basvuru` ile mağaza başvurusu yap → `/satici-basvuru/durum` "İnceleniyor" der.
2. Yönetici hesabıyla `/yonetim` → başvuruyu **Onayla**. Onaydan önce mağaza satışa kapalıdır, panel açılmaz.
3. Satıcı panelinden ürün ekle, görsel yükle, **Satışa yayınla**.
4. Üçüncü bir müşteri hesabıyla sepete ekle → `/odeme` → sipariş ver. Stok sunucuda düşer, satıcı `/satici-panel/siparisler` içinde görür.
5. Ürün sayfasından soru sor → `/satici-panel/sorular` üzerinden yanıtla → yanıt ürün sayfasında herkese görünür.
6. Teslim edilen siparişte `/hesabim/iadeler` ile iade talebi aç → satıcı onaylar / reddeder.

## 7. Yerel kural testleri (isteğe bağlı)

Migration'ların ve kuralların (stok, çift sipariş, çapraz mağaza erişimi, maliyet sızıntısı vb.) doğrulanması için, **Supabase projene
dokunmadan**, boş bir yerel PostgreSQL üzerinde çalışır:

```bash
PGHOST=localhost PGUSER=postgres bash supabase/tests/run-local.sh
```

`run-local.sh` sırasıyla `10_rules.test.sql` (kurallar), `30_seller_documents.test.sql` (özel kova, belge politikaları, başvuru kararı) ve `20_concurrency.sh` dosyalarını çalıştırır. Bu testler Supabase'in `auth` / `storage` şemalarını taklit eden bir katman (`00_supabase_shim.sql`) kullanır; gerçek
Supabase'in yerine geçmez. Kendi projende 6. bölümdeki denemeyi yapmak asıl doğrulamadır.

## Bilinen sınırlar

- **Ödeme yoktur.** Sipariş verilir, stok düşer, ama tahsilat yapılmaz; ödeme sağlayıcısı bağlanınca eklenecek. Arayüz bunu açıkça belirtir.
- Kargo, e-fatura, gerçek para iadesi ve banka transferi entegre değildir. "Ödendi" ve "iade edildi" kayıt amaçlıdır.
- Sipariş **mağaza başına** oluşur; kupon ve hızlı kargo her mağaza siparişine ayrı uygulanır.
- Aktif mağazaların iletişim e-postası / telefonu herkese açık okunur (mağaza sayfası için). Kişisel bilgi girme.
- Şifre sıfırlama akışı henüz yoktur (Supabase panelinden kullanıcıya gönderilebilir).
- T.C. kimlik no, doğum tarihi, tam IBAN ve şifre veritabanına yazılmaz (yalnızca maskeli IBAN). Belgelerin (kimlik, vergi levhası vb.) DOSYALARI ise yalnızca özel `seller-documents` kovasında tutulur; tabloda yalnızca dosya adı, tür ve boyut meta bilgisi vardır.
- Belge dosyasının gerçek türü yüklemeden önce tarayıcıda (ilk baytlar) denetlenir; sunucu tarafında kova MIME ve 10 MB sınırını zorlar, ancak dosya içeriği virüs taramasından geçirilmez.
- Örnek katalog (Aşama 1 vitrin ürünleri) gerçek modda görüntülenir ama sipariş edilemez.
