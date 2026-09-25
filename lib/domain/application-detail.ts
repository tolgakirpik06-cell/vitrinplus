/**
 * Yönetici başvuru detayı için, `seller_accounts.application` (bkz. lib/domain/application.ts `SanitizedApplication`)
 * içindeki GERÇEK alanları okunabilir bölümlere çevirir. Alan adları tahmin edilmez: yalnızca sanitizeApplication'ın
 * yazdığı anahtarlar okunur; kayıtta olmayan değer "—" olarak gösterilir, uydurulmaz.
 */
import { sellerTypeLabels } from "@/lib/seller-application";
import type { SellerType } from "@/types/seller-application";

export type DetailRow = { label: string; value: string | null };
export type DetailSection = { id: string; title: string; rows: DetailRow[] };

export type ApplicationDetailContent = {
  sellerType: SellerType | null;
  sellerTypeLabel: string;
  /** Yalnızca dosya bilgisi olarak başvuru formunda yazılmış belge adları (dosyanın kendisi değildir). */
  declaredDocuments: { key: string; name: string; size: number; type: string }[];
  sections: DetailSection[];
  /** Kayıt biçimi tanınmadıysa true: bölümler boş kalır ve arayüz bunu açıkça söyler. */
  unrecognized: boolean;
};

/** Veri minimizasyonu (KVKK): form bunları toplasa da veritabanına yazılmaz. Arayüz bunu yönetici için açıkça belirtir. */
export const NOT_STORED_FIELDS = ["T.C. kimlik no", "Doğum tarihi", "Tam IBAN", "Şifre"] as const;

type Bag = Record<string, unknown>;

function bag(value: unknown): Bag {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Bag) : {};
}

function str(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function yesNo(value: unknown): string | null {
  return typeof value === "boolean" ? (value ? "Evet" : "Hayır") : null;
}

const INVOICE_LABELS: Record<string, string> = {
  "kendi-sistemim": "Kendi e-fatura sistemimi kullanacağım",
  "vitrinplus-entegrasyonu": "VitrinPlus entegrasyonu",
  "sonra-ayarlayacagim": "Daha sonra ayarlayacağım",
};

/** Başvuru kaydındaki satıcı tipi (yoksa / tanınmazsa `null`). */
export function sellerTypeOf(raw: unknown): SellerType | null {
  const type = bag(raw).sellerType;
  return type === "sahis" || type === "limited-as" ? type : null;
}

export function parseApplicationDetail(raw: unknown): ApplicationDetailContent {
  const app = bag(raw);
  const recognized = app.version === 1;
  const sellerType: SellerType | null = app.sellerType === "sahis" || app.sellerType === "limited-as" ? app.sellerType : null;

  const contact = bag(app.contact);
  const business = bag(app.business);
  const bank = bag(app.bank);
  const shipping = bag(app.shipping);
  const store = bag(app.store);
  const agreement = bag(app.agreement);

  const categories = Array.isArray(store.categories) ? store.categories.map(str).filter((item): item is string => item !== null) : [];
  const returnSame = shipping.iadeAdresiAyni === true;

  const sections: DetailSection[] = [
    {
      id: "store",
      title: "Mağaza bilgileri",
      rows: [
        { label: "Mağaza adı", value: str(store.name) },
        { label: "Açıklama", value: str(store.description) },
        { label: "Ana kategoriler", value: categories.length ? categories.join(", ") : null },
      ],
    },
    {
      id: "contact",
      title: "Yetkili kişi ve iletişim",
      rows: [
        { label: "Ad soyad", value: str(contact.name) },
        { label: "E-posta", value: str(contact.email) },
        { label: "Telefon", value: str(contact.phone) },
      ],
    },
    {
      id: "business",
      title: sellerType === "limited-as" ? "Şirket bilgileri" : "İşletme bilgileri",
      rows:
        sellerType === "limited-as"
          ? [
              { label: "Şirket unvanı", value: str(business.sirketUnvani) },
              { label: "Vergi dairesi", value: str(business.vergiDairesi) },
              { label: "Vergi numarası", value: str(business.vergiNumarasi) },
              { label: "MERSİS numarası", value: str(business.mersisNumarasi) },
              { label: "Ticaret sicil numarası", value: str(business.ticaretSicilNumarasi) },
              { label: "Yetkili kişi", value: str(business.yetkiliKisi) },
              { label: "Şirket adresi", value: str(business.sirketAdresi) },
              { label: "İl / İlçe", value: joinPlace(business.il, business.ilce) },
            ]
          : [
              { label: "Ticari unvan", value: str(business.ticariUnvan) },
              { label: "Vergi dairesi", value: str(business.vergiDairesi) },
              { label: "Vergi numarası / VKN", value: str(business.vergiNumarasi) },
              { label: "İşletme adresi", value: str(business.isletmeAdresi) },
              { label: "İl / İlçe", value: joinPlace(business.il, business.ilce) },
            ],
    },
    {
      id: "shipping",
      title: "Kargo ve iade adresi",
      rows: [
        { label: "Gönderim adresi", value: joinAddress(shipping.acikAdres, shipping.ilce, shipping.il) },
        { label: "İade adresi gönderim adresiyle aynı", value: yesNo(shipping.iadeAdresiAyni) },
        ...(returnSame ? [] : [{ label: "İade adresi", value: joinAddress(shipping.iadeAcikAdres, shipping.iadeIlce, shipping.iadeIl) }]),
      ],
    },
    {
      id: "bank",
      title: "Banka / ödeme bilgileri",
      rows: [
        { label: "IBAN (maskeli)", value: str(bank.ibanMasked) },
        { label: "Banka", value: str(bank.bankName) },
        { label: "Hesap sahibi", value: str(bank.holderName) },
      ],
    },
    {
      id: "preferences",
      title: "Tercihler ve onaylar",
      rows: [
        { label: "Fatura tercihi", value: typeof app.invoicePreference === "string" ? (INVOICE_LABELS[app.invoicePreference] ?? app.invoicePreference) : null },
        { label: "Satıcı sözleşmesi onayı", value: yesNo(agreement.contract) },
        { label: "KVKK aydınlatma onayı", value: yesNo(agreement.kvkk) },
        { label: "Ticari elektronik ileti izni", value: yesNo(agreement.commercialMessages) },
      ],
    },
  ];

  const documents = bag(app.documents);
  const declaredDocuments = Object.entries(documents).flatMap(([key, value]) => {
    const meta = bag(value);
    const name = str(meta.name);
    return name ? [{ key, name, size: typeof meta.size === "number" ? meta.size : 0, type: str(meta.type) ?? "" }] : [];
  });

  return { sellerType, sellerTypeLabel: sellerType ? sellerTypeLabels[sellerType] : "Belirtilmemiş", declaredDocuments, sections, unrecognized: !recognized };
}

function joinPlace(city: unknown, district: unknown): string | null {
  const parts = [str(district), str(city)].filter((part): part is string => part !== null);
  return parts.length ? parts.join(" / ") : null;
}

function joinAddress(line: unknown, district: unknown, city: unknown): string | null {
  const address = str(line);
  const place = joinPlace(city, district);
  if (address && place) return `${address}, ${place}`;
  return address ?? place;
}
