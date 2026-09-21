/**
 * Ürün formu — saf yardımcılar (arayüzden bağımsız).
 * Form alanları metin olarak tutulur (input değeri); kayda dönüşürken sayıya çevrilir.
 */
import type { ProductStatus, SellerProduct } from "@/lib/demo-marketplace";
import { fixedCost, type CostBreakdown } from "@/lib/profit";

export const MAX_IMAGES = 8;
export const SHORT_DESCRIPTION_LIMIT = 500;

/** `stock`: seçenek bazlı stok (yalnızca gerçek modda doldurulur; boş = seçenek stoğu takip edilmiyor). */
export type VariantForm = { id: string; label: string; sku: string; stock: string };

export type ProductFormState = {
  name: string;
  category: string;
  brand: string;
  model: string;
  shortDescription: string;
  description: string;
  images: string[];
  price: string;
  salePrice: string;
  saleStart: string;
  saleEnd: string;
  productCost: string;
  shipping: string;
  packaging: string;
  payment: string;
  other: string;
  stock: string;
  sku: string;
  barcode: string;
  criticalThreshold: string;
  autoPassive: boolean;
  variants: VariantForm[];
};

export const emptyProductForm: ProductFormState = {
  name: "",
  category: "",
  brand: "",
  model: "",
  shortDescription: "",
  description: "",
  images: [],
  price: "",
  salePrice: "",
  saleStart: "",
  saleEnd: "",
  productCost: "",
  shipping: "",
  packaging: "",
  payment: "",
  other: "",
  stock: "",
  sku: "",
  barcode: "",
  criticalThreshold: "",
  autoPassive: false,
  variants: [],
};

/** "1.250,5" veya "1250.5" → 1250.5; boş/geçersiz → NaN. */
export function toNumber(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

export function numberOrZero(text: string): number {
  const value = toNumber(text);
  return Number.isNaN(value) ? 0 : value;
}

export function formToCosts(form: Pick<ProductFormState, "productCost" | "shipping" | "packaging" | "payment" | "other">): CostBreakdown {
  return {
    productCost: numberOrZero(form.productCost),
    shipping: numberOrZero(form.shipping),
    packaging: numberOrZero(form.packaging),
    payment: numberOrZero(form.payment),
    other: numberOrZero(form.other),
  };
}

const show = (value: number | undefined): string => (value === undefined || !Number.isFinite(value) || value === 0 ? "" : String(value));

export function productToForm(product: SellerProduct): ProductFormState {
  return {
    name: product.name,
    category: product.category,
    brand: product.brand ?? "",
    model: product.model ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    images: product.images ?? [],
    price: product.price ? String(product.price) : "",
    salePrice: show(product.salePrice),
    saleStart: product.saleStart ?? "",
    saleEnd: product.saleEnd ?? "",
    productCost: show(product.cost),
    shipping: show(product.costs?.shipping),
    packaging: show(product.costs?.packaging),
    payment: show(product.costs?.payment),
    other: show(product.costs?.other),
    stock: String(product.stock),
    sku: product.sku,
    barcode: product.barcode ?? "",
    criticalThreshold: show(product.criticalThreshold),
    autoPassive: product.autoPassive === true,
    variants: (product.variants ?? []).map((variant) => ({ id: variant.id, label: variant.label, sku: variant.sku ?? "", stock: variant.stock === undefined ? "" : String(variant.stock) })),
  };
}

export type FormErrors = Partial<Record<keyof ProductFormState, string>>;

/**
 * Taslak için yalnızca ürün adı zorunludur. Yayın için ad, kategori, SKU, fiyat ve stok gerekir.
 * SKU tekrarını yakalamak için mevcut SKU'lar verilir (düzenlenen ürünün kendi SKU'su hariç).
 */
export function validateProductForm(form: ProductFormState, mode: "draft" | "publish", existingSkus: string[]): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Ürün adı zorunlu.";
  else if (form.name.trim().length < 3) errors.name = "Ürün adı en az 3 karakter olmalı.";

  const numberFields: [keyof ProductFormState, string][] = [
    ["productCost", "Ürün maliyeti"],
    ["shipping", "Kargo maliyeti"],
    ["packaging", "Paketleme maliyeti"],
    ["payment", "Ödeme altyapısı kesintisi"],
    ["other", "Diğer giderler"],
  ];
  for (const [key, label] of numberFields) {
    const raw = form[key] as string;
    if (raw.trim() && (Number.isNaN(toNumber(raw)) || toNumber(raw) < 0)) errors[key] = `${label} 0 veya daha büyük bir sayı olmalı.`;
  }
  if (form.price.trim() && (Number.isNaN(toNumber(form.price)) || toNumber(form.price) < 0)) errors.price = "Satış fiyatı geçerli bir sayı olmalı.";
  if (form.stock.trim() && (Number.isNaN(toNumber(form.stock)) || toNumber(form.stock) < 0 || !Number.isInteger(toNumber(form.stock)))) errors.stock = "Stok adedi 0 veya daha büyük bir tam sayı olmalı.";
  if (form.criticalThreshold.trim() && (Number.isNaN(toNumber(form.criticalThreshold)) || toNumber(form.criticalThreshold) < 0 || !Number.isInteger(toNumber(form.criticalThreshold)))) {
    errors.criticalThreshold = "Kritik eşik 0 veya daha büyük bir tam sayı olmalı.";
  }
  if (form.shortDescription.length > SHORT_DESCRIPTION_LIMIT) errors.shortDescription = `Kısa açıklama en fazla ${SHORT_DESCRIPTION_LIMIT} karakter olabilir.`;

  if (form.barcode.trim().length > 64) errors.barcode = "Barkod en fazla 64 karakter olabilir.";
  if (form.variants.some((variant) => variant.stock.trim() && (Number.isNaN(toNumber(variant.stock)) || toNumber(variant.stock) < 0 || !Number.isInteger(toNumber(variant.stock))))) {
    errors.variants = "Varyant stokları 0 veya daha büyük tam sayı olmalı.";
  }
  const namedVariants = form.variants.filter((variant) => variant.label.trim());
  const labels = namedVariants.map((variant) => variant.label.trim().toLocaleLowerCase("tr-TR"));
  if (!errors.variants && new Set(labels).size !== labels.length) errors.variants = "Aynı adı taşıyan iki varyant olamaz.";
  // Seçenek bazlı stok takip ediliyorsa her adlandırılmış varyantın stoğu girilmiş olmalı (boş bırakılan 0 sayılır ve müşteriye "tükendi" görünür).
  const tracksVariantStock = namedVariants.some((variant) => variant.stock.trim());
  if (!errors.variants && tracksVariantStock && namedVariants.some((variant) => !variant.stock.trim())) errors.variants = "Varyant stoğu takip ediliyorsa her varyant için stok gir (0 olabilir).";

  const sku = form.sku.trim();
  if (sku && existingSkus.includes(sku)) errors.sku = "Bu SKU başka bir üründe kullanılıyor.";

  const sale = toNumber(form.salePrice);
  if (form.salePrice.trim()) {
    const price = toNumber(form.price);
    if (Number.isNaN(sale) || sale <= 0) errors.salePrice = "İndirimli fiyat 0'dan büyük olmalı.";
    else if (!Number.isNaN(price) && sale >= price) errors.salePrice = "İndirimli fiyat satış fiyatından düşük olmalı.";
  }
  if (form.saleStart && form.saleEnd && form.saleEnd < form.saleStart) errors.saleEnd = "İndirim bitişi başlangıçtan önce olamaz.";

  if (mode === "publish") {
    if (!form.category.trim()) errors.category = "Kategori seç.";
    if (!sku) errors.sku = "Satışa yayınlamak için SKU gerekli.";
    if (!form.price.trim() || Number.isNaN(toNumber(form.price)) || toNumber(form.price) <= 0) errors.price = "Satış fiyatı 0'dan büyük olmalı.";
    // Seçenek bazlı stokta ürün stoğu varyant stoklarının toplamıdır; ayrıca girilmesi gerekmez.
    if (!tracksVariantStock && !form.stock.trim()) errors.stock = "Stok adedini gir (0 olabilir).";
  }
  return errors;
}

/** Form → ürün kaydı. Boş opsiyonel alanlar kayda hiç eklenmez. */
export function formToProduct(form: ProductFormState, status: ProductStatus, base?: SellerProduct): Omit<SellerProduct, "id"> {
  const cost = numberOrZero(form.productCost);
  const extras = { shipping: numberOrZero(form.shipping), packaging: numberOrZero(form.packaging), payment: numberOrZero(form.payment), other: numberOrZero(form.other) };
  const hasExtras = Object.values(extras).some((value) => value > 0);
  const sale = toNumber(form.salePrice);
  const threshold = toNumber(form.criticalThreshold);
  const variants = form.variants
    .filter((variant) => variant.label.trim())
    .map((variant) => ({ id: variant.id, label: variant.label.trim(), ...(variant.sku.trim() ? { sku: variant.sku.trim() } : {}), ...(variant.stock.trim() ? { stock: Math.max(0, Math.round(numberOrZero(variant.stock))) } : {}) }));
  // Seçenek bazlı stok takip ediliyorsa ürün stoğu seçenek stoklarının toplamıdır.
  const tracksVariantStock = variants.some((variant) => variant.stock !== undefined);
  const totalStock = tracksVariantStock ? variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0) : Math.max(0, Math.round(numberOrZero(form.stock)));
  const { id: _id, ...rest } = (base ?? {}) as SellerProduct;
  void _id;
  return {
    ...rest,
    name: form.name.trim(),
    sku: form.sku.trim(),
    barcode: form.barcode.trim() || undefined,
    category: form.category.trim() || "Genel",
    price: numberOrZero(form.price),
    cost,
    stock: totalStock,
    status,
    brand: form.brand.trim() || undefined,
    model: form.model.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    description: form.description.trim() || undefined,
    images: form.images.length ? form.images : undefined,
    costs: hasExtras ? extras : undefined,
    salePrice: Number.isNaN(sale) ? undefined : sale,
    saleStart: form.saleStart || undefined,
    saleEnd: form.saleEnd || undefined,
    criticalThreshold: Number.isNaN(threshold) ? undefined : threshold,
    autoPassive: form.autoPassive || undefined,
    variants: variants.length ? variants : undefined,
  };
}

/** "AP-1234" biçiminde, mevcutlarla çakışmayan SKU önerisi. */
export function generateSku(existing: string[], name: string): string {
  const letters = name
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-ZÇĞİÖŞÜ0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.slice(0, 2))
    .join("");
  const prefix = (letters || "VP").replace(/[ÇĞİÖŞÜ]/g, (char) => ({ Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" })[char] ?? char);
  for (let number = 1; number < 10_000; number += 1) {
    const candidate = `${prefix}-${String(number).padStart(3, "0")}`;
    if (!existing.includes(candidate)) return candidate;
  }
  return `${prefix}-${Date.now()}`;
}

/** DEMO: şablondan açıklama üretir (gerçek yapay zekâ bağlı değildir). */
export function generateDescription(form: Pick<ProductFormState, "name" | "brand" | "model" | "shortDescription" | "category">): string {
  const title = [form.brand.trim(), form.name.trim()].filter(Boolean).join(" ");
  const lead = form.shortDescription.trim() || `${title || "Bu ürün"}, günlük kullanım için tasarlandı.`;
  return [
    lead,
    "",
    "Öne çıkan özellikler:",
    `- ${form.category.trim() ? `${form.category.trim()} kategorisinde` : "Kategorisinde"} kaliteli ve dayanıklı yapı`,
    form.model.trim() ? `- Model: ${form.model.trim()}` : "- Kullanım kolaylığı sağlayan tasarım",
    "- Hızlı kargo ve güvenli paketleme",
    "",
    "Taslak metni ürününe göre düzenlemeyi unutma.",
  ].join("\n");
}

/** Toplam maliyet (komisyon hariç). */
export function formFixedCost(form: ProductFormState): number {
  return fixedCost(formToCosts(form));
}
