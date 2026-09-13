/**
 * PazarBuy satıcı başvuru sihirbazı için tip tanımları.
 * Bu dosya sadece veri şeklini tanımlar; gerçek bir backend/API entegrasyonu
 * henüz yok — form state'i frontend'de tutulur ve taslak olarak
 * localStorage'a yazılır (gerçek belge içerikleri HARİÇ).
 */

export type SellerType = "bireysel" | "sahis" | "limited-as";

/**
 * Satıcı başvurusunun yaşam döngüsü. Gerçek bir admin/inceleme sistemi
 * olmadığından, form gönderildiğinde durum asla otomatik olarak
 * "onaylandi" yapılmaz — "gonderildi" ile başlar.
 */
export type ApplicationStatus =
  | "taslak"
  | "gonderildi"
  | "inceleniyor"
  | "ek-belge-gerekli"
  | "onaylandi"
  | "reddedildi";

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  taslak: "Taslak",
  gonderildi: "Başvuru Gönderildi",
  inceleniyor: "İnceleniyor",
  "ek-belge-gerekli": "Ek Belge Gerekli",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

export type InvoicePreference =
  | "kendi-sistemim"
  | "pazarbuy-entegrasyonu"
  | "sonra-ayarlayacagim";

export type SellerPlanId = "baslangic" | "pro" | "premium";

/**
 * Yüklenen bir belgenin sadece meta bilgisi. Gerçek dosya içeriği/base64
 * ASLA burada veya localStorage'da saklanmaz — sadece bu oturumun
 * bellek (state) içindeki File referansı kullanılır.
 */
export type UploadedDocMeta = {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export type SellerAccountData = {
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  tcKimlikNo: string;
  dogumTarihi: string;
  sifre: string;
  sifreTekrar: string;
};

export type SellerBusinessData = {
  // Bireysel / Şahıs işletmesi alanları
  ticariUnvan: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  isletmeAdresi: string;
  il: string;
  ilce: string;
  // Limited / Anonim Şirket'e özel ek alanlar
  sirketUnvani: string;
  mersisNumarasi: string;
  ticaretSicilNumarasi: string;
  yetkiliKisi: string;
  sirketAdresi: string;
};

export type SellerBankData = {
  iban: string;
  bankaAdi: string;
  hesapSahibiAdi: string;
};

export type SellerShippingData = {
  il: string;
  ilce: string;
  acikAdres: string;
  iadeAdresiAyni: boolean;
  iadeIl: string;
  iadeIlce: string;
  iadeAcikAdres: string;
};

export type SellerStoreData = {
  magazaAdi: string;
  magazaSlug: string;
  aciklama: string;
  logo: UploadedDocMeta | null;
  kapakGorseli: UploadedDocMeta | null;
  anaKategoriler: string[];
};

export type SellerDocumentKey =
  | "kimlik"
  | "vergiLevhasi"
  | "imzaBeyannamesi"
  | "ticaretSicilBelgesi"
  | "faaliyetBelgesi";

export type SellerDocumentsData = Partial<Record<SellerDocumentKey, UploadedDocMeta>>;

export type SellerAgreementData = {
  sozlesmeKabul: boolean;
  kvkkKabul: boolean;
  ticariIletiKabul: boolean;
};

export type SellerApplicationData = {
  sellerType: SellerType | null;
  account: SellerAccountData;
  business: SellerBusinessData;
  bank: SellerBankData;
  shipping: SellerShippingData;
  store: SellerStoreData;
  documents: SellerDocumentsData;
  invoicePreference: InvoicePreference | null;
  planId: SellerPlanId | null;
  agreement: SellerAgreementData;
  status: ApplicationStatus;
  applicationId: string | null;
};

export type SellerPlan = {
  id: SellerPlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  features: string[];
  featured?: boolean;
};

export const initialSellerApplicationData: SellerApplicationData = {
  sellerType: null,
  account: {
    ad: "",
    soyad: "",
    email: "",
    telefon: "",
    tcKimlikNo: "",
    dogumTarihi: "",
    sifre: "",
    sifreTekrar: "",
  },
  business: {
    ticariUnvan: "",
    vergiDairesi: "",
    vergiNumarasi: "",
    isletmeAdresi: "",
    il: "",
    ilce: "",
    sirketUnvani: "",
    mersisNumarasi: "",
    ticaretSicilNumarasi: "",
    yetkiliKisi: "",
    sirketAdresi: "",
  },
  bank: {
    iban: "",
    bankaAdi: "",
    hesapSahibiAdi: "",
  },
  shipping: {
    il: "",
    ilce: "",
    acikAdres: "",
    iadeAdresiAyni: true,
    iadeIl: "",
    iadeIlce: "",
    iadeAcikAdres: "",
  },
  store: {
    magazaAdi: "",
    magazaSlug: "",
    aciklama: "",
    logo: null,
    kapakGorseli: null,
    anaKategoriler: [],
  },
  documents: {},
  invoicePreference: null,
  planId: null,
  agreement: {
    sozlesmeKabul: false,
    kvkkKabul: false,
    ticariIletiKabul: false,
  },
  status: "taslak",
  applicationId: null,
};
