/** CSV'den toplu ürün içe aktarma — saf doğrulama (arayüzden bağımsız). */
import type { SellerProduct } from "@/lib/demo-marketplace";
import { toNumber } from "@/lib/product-form";

export const IMPORT_ROW_LIMIT = 1000;

const aliases = {
  name: ["urun adi", "ad", "isim", "name", "baslik", "urun"],
  sku: ["sku", "stok kodu", "urun kodu"],
  category: ["kategori", "category"],
  price: ["satis fiyati", "fiyat", "price"],
  cost: ["maliyet", "alis fiyati", "cost"],
  stock: ["stok", "stok adedi", "adet", "stock"],
  brand: ["marka", "brand"],
  model: ["model"],
  shortDescription: ["kisa aciklama", "aciklama"],
} as const;

type Field = keyof typeof aliases;

function normalizeHeader(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ImportRowError = { row: number; message: string };

export type ImportResult = {
  products: Omit<SellerProduct, "id">[];
  errors: ImportRowError[];
  /** Başlık satırı tanınmadıysa (zorunlu sütun yok). */
  headerError?: string;
  totalRows: number;
};

export const IMPORT_TEMPLATE: string[][] = [
  ["Ürün Adı", "SKU", "Kategori", "Satış Fiyatı", "Maliyet", "Stok", "Marka", "Model"],
  ["Örnek Kablosuz Kulaklık", "ORNEK-001", "Elektronik", "899", "620", "50", "Nova", "KP-500"],
  ["Örnek Pamuklu Tişört", "ORNEK-002", "Erkek", "349", "140", "120", "Kuzey", "OT-210"],
];

/** Başlık + veri satırlarını doğrular. `existingSkus` mevcut ürün SKU'larıdır; `remaining` paket kapasitesidir (null = sınırsız). */
export function validateImport(rows: string[][], existingSkus: string[], remaining: number | null): ImportResult {
  if (rows.length === 0) return { products: [], errors: [], headerError: "Dosya boş görünüyor.", totalRows: 0 };
  const header = rows[0].map(normalizeHeader);
  const index = {} as Record<Field, number>;
  (Object.keys(aliases) as Field[]).forEach((field) => {
    index[field] = header.findIndex((cell) => (aliases[field] as readonly string[]).includes(cell));
  });
  const missing = (["name", "sku", "price", "stock"] as Field[]).filter((field) => index[field] < 0);
  if (missing.length) {
    const labels: Record<Field, string> = { name: "Ürün Adı", sku: "SKU", category: "Kategori", price: "Satış Fiyatı", cost: "Maliyet", stock: "Stok", brand: "Marka", model: "Model", shortDescription: "Kısa Açıklama" };
    return { products: [], errors: [], headerError: `Zorunlu sütun(lar) bulunamadı: ${missing.map((field) => labels[field]).join(", ")}.`, totalRows: rows.length - 1 };
  }

  const dataRows = rows.slice(1);
  const errors: ImportRowError[] = [];
  const products: Omit<SellerProduct, "id">[] = [];
  const seen = new Set(existingSkus);
  const cell = (row: string[], field: Field) => (index[field] >= 0 ? (row[index[field]] ?? "").trim() : "");

  dataRows.slice(0, IMPORT_ROW_LIMIT).forEach((row, position) => {
    const line = position + 2;
    const name = cell(row, "name");
    const sku = cell(row, "sku");
    const price = toNumber(cell(row, "price"));
    const stock = toNumber(cell(row, "stock"));
    const costText = cell(row, "cost");
    const cost = costText ? toNumber(costText) : 0;
    if (name.length < 3) return void errors.push({ row: line, message: "Ürün adı en az 3 karakter olmalı." });
    if (!sku) return void errors.push({ row: line, message: "SKU boş olamaz." });
    if (seen.has(sku)) return void errors.push({ row: line, message: `SKU zaten kullanılıyor: ${sku}` });
    if (Number.isNaN(price) || price <= 0) return void errors.push({ row: line, message: "Satış fiyatı 0'dan büyük bir sayı olmalı." });
    if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) return void errors.push({ row: line, message: "Stok 0 veya daha büyük bir tam sayı olmalı." });
    if (Number.isNaN(cost) || cost < 0) return void errors.push({ row: line, message: "Maliyet 0 veya daha büyük bir sayı olmalı." });
    if (remaining !== null && products.length >= remaining) return void errors.push({ row: line, message: "Paket ürün limiti doldu; bu satır içe aktarılmadı." });
    seen.add(sku);
    products.push({
      name,
      sku,
      category: cell(row, "category") || "Genel",
      price,
      cost,
      stock,
      status: "aktif",
      brand: cell(row, "brand") || undefined,
      model: cell(row, "model") || undefined,
      shortDescription: cell(row, "shortDescription") || undefined,
    });
  });
  if (dataRows.length > IMPORT_ROW_LIMIT) errors.push({ row: IMPORT_ROW_LIMIT + 2, message: `Tek seferde en fazla ${IMPORT_ROW_LIMIT} satır içe aktarılır; kalan satırlar okunmadı.` });
  return { products, errors, totalRows: dataRows.length };
}
