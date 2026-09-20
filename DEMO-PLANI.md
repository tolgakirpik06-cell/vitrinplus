# VitrinPlus — bugünün teslim planı

## Hedef

Aynı tarayıcıda alıcı, satıcı ve yönetici rollerinin denenebildiği uçtan uca demo.
Başlangıç adresi: `/demo`. Gerçek ödeme, gerçek üyelik veya canlı satış yapılmaz.

## İş sırası ve kabul ölçütleri

1. Hesap: demo kayıt, giriş, çıkış; yenilemeden sonra oturumun korunması.
2. Satıcı: mağaza başvurusu, bekleyen/onaylı/reddedilen durumlar ve açık yönetici simülasyonu.
3. Ürün: mağazaya ait ürün ekleme, düzenleme, silme; ana sayfada ve demo rehberinde görünmesi; ürün detayına erişim.
4. Alışveriş: favori, sepet, adet, kupon; sepet ve ödeme toplamlarının aynı olması.
5. Sipariş: başarılı/reddedilen ödeme simülasyonu; kalıcı sipariş özeti; stok yetersizliğinin engellenmesi.
6. Takip: alıcı sipariş geçmişi; satıcının siparişleri; hazırlama, kargo ve teslim durumları; iptalde stok iadesi.
7. Doğrulama: TypeScript, ESLint, sipariş mantığı testleri, üretim derlemesi ve tarayıcıda uçtan uca senaryo.

## Sunum senaryosu

1. `/kayit`: `satici@example.com` ile örnek hesap oluştur.
2. `/demo`: mağaza adıyla başvur; yönetici simülasyonunda onay ver.
3. `/satici-panel`: Ürünler sekmesinden fiyatı 300 TL, stoğu 2 olan örnek ürün ekle.
4. `/hesabim`: çıkış yap; ikinci bir alıcı demo hesabı oluştur.
5. `/demo` veya ana sayfadan ürüne gir, sepete ekle. `VITRINPLUS10` kuponunu dene.
6. Ödemede örnek adres kullan. Önce reddedilen ödemeyi dene; sepet korunmalı.
7. Başarılı ödemeyi seç. Sipariş `/siparislerim` ekranında görünmeli; sayfa yenilenince kalmalı.
8. Satıcı hesabına geç; sipariş panelinde kaydı gör. Demo rehberinden de durumu ilerletebilirsin.
9. İkinci siparişte iptali dene; ürün stoğu geri gelmeli.

## Demo sınırları

- Kayıtlar `localStorage` içinde bu tarayıcıya aittir; cihazlar arasında paylaşılmaz. Tarayıcı verileri silinirse kaybolur.
- Sunum tek etkin sekmede yürütülmelidir; sunucuya ait eşzamanlı işlem garantisi yoktur. Sepet ve favoriler tarayıcı düzeyindedir.
- Hesaplar şifresiz demo kimlikleridir; e-posta doğrulaması ve gerçek yetkilendirme yoktur. Yönetici simülasyonu açıkça erişilebilirdir.
- Kart bilgisi alınmaz. Ödeme, kargo, e-posta ve belge inceleme servisleri bağlı değildir.
- Siparişin ürün adı/fiyatı satın alma anında sabitlenir. Kupon `%10`; indirim sonrası 250 TL altı standart kargo 49,90 TL; hızlı kargo +29,90 TL.
- Çok satıcılı siparişlerde ortak durum yönetici simülasyonundan ilerletilir. Ayrı kargo ve satıcı hakedişi üretim aşamasına aittir.
- Katalogdaki hazır ürünler örnektir. Yeni mağaza ürünleri ana sayfada, demo rehberinde ve arama sonuçlarında ayrıca listelenir.
- Kampanya, reklam, yapay zekâ ve banka aktarımı çekirdek demo kabul ölçütlerine dahil değildir. Mevcut önizleme ekranları bunu belirtir.

## Canlı ürün için sonraki plan

1. Sunucuda veritabanı ve şema: kullanıcı, mağaza, ürün, stok hareketi, sipariş/kalem, ödeme, iade ve denetim kaydı.
2. Gerçek oturum, e-posta doğrulama, parola sıfırlama, satıcı/yönetici rolleri ve veri erişim kuralları.
3. Sunucuda fiyat hesaplama, stok rezervasyonu, eşzamanlı işlemler ve tekrarlanan ödeme bildirimlerini tek işleme indirme.
4. Ödeme sağlayıcısının pazaryeri modeli, alt satıcı kaydı, test ortamı, webhook, iade ve hakediş mutabakatı.
5. Belge/görsel depolama, satıcı incelemesi, kargo ve bildirim servisleri.
6. İşletmeye uygun sözleşmeler, gizlilik metinleri, operasyon ve müşteri destek süreçleri.
7. Üretim güvenlik testleri, yedekleme, hata izleme, alan adı/ortam ayarları ve kontrollü pilot yayın.

Ödeme deneyimi olan geliştiriciye verilebilecek ilk iş: mevcut demo akışını inceleyip ödeme–sipariş–iade durumlarının sunucu sözleşmesini ve sağlayıcının test entegrasyonunu hazırlamak. Kullanılacak sağlayıcı ve gerçek hesaplar henüz seçilmedi.

## Doğrulama kaydı — 20 Eylül 2026

- TypeScript, ESLint, 12 sipariş/stok testi ve üretim derlemesi başarılı.
- Tarayıcıda ayrı satıcı ve alıcı hesaplarıyla kayıt/giriş/çıkış, mağaza başvurusu/onayı, ürün ekleme, ürün detayı, sepet ve kupon denendi.
- 300 TL ürünün VITRINPLUS10 kuponuyla sepet ve ödeme toplamı 270 TL oldu.
- Reddedilen ödeme sepeti korudu. Başarılı ödeme kaydı sayfa yenilemesinden sonra da göründü.
- Satıcıda stok 2 → 1; sipariş hazırlanmaya alındı; yönetici simülasyonundaki iptalden sonra stok 1 → 2 oldu.
- Mobil ürün ekranında yatay taşma görülmedi. Uygulama kaynaklı konsol hatası görülmedi.
- Tarayıcı test hesapları: `satici.test@example.com` ve `alici.test@example.com`; şifre yok. Yalnızca testin yapıldığı tarayıcıda mevcutlar.
