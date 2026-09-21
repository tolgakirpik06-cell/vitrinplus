import type { CartLine, Product } from "@/types";
import { quoteStoreOrder, type OrderQuote, type StoreShipping } from "./order-engine";
import { round2 } from "./money";

/**
 * Gerçek mod sepet özeti. Sunucudaki `place_order` ile aynı kural: sipariş MAĞAZA başına oluşur;
 * kupon, kargo ücreti / ücretsiz kargo eşiği ve hızlı kargo her mağaza siparişi için ayrı hesaplanır.
 * Bu yalnızca bir ÖNİZLEMEDİR — geçerli toplamı sunucu belirler, istemci fiyatına güvenilmez.
 */
export const DEFAULT_STORE_SHIPPING: StoreShipping = { shippingFee: 49.9, freeShippingThreshold: 250 };

export type QuotedLine = { line: CartLine; product: Product };
export type StoreGroup = { seller: string; lines: QuotedLine[]; quote: OrderQuote; shipping: StoreShipping };
export type CartQuote = {
  groups: StoreGroup[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** Mağaza kaydı olmayan (örnek katalog) ürün satırları: gerçek modda sipariş edilemez. */
  notOrderable: QuotedLine[];
};

export function quoteCart(entries: readonly QuotedLine[], options: { coupon?: string | null; express?: boolean } = {}): CartQuote {
  const bySeller = new Map<string, QuotedLine[]>();
  const notOrderable: QuotedLine[] = [];
  for (const entry of entries) {
    if (!entry.product.storeInfo) {
      notOrderable.push(entry);
      continue;
    }
    const list = bySeller.get(entry.product.seller) ?? [];
    list.push(entry);
    bySeller.set(entry.product.seller, list);
  }
  const groups: StoreGroup[] = [];
  for (const [seller, lines] of bySeller) {
    const info = lines[0].product.storeInfo;
    const shipping: StoreShipping = info ? { shippingFee: info.shippingFee, freeShippingThreshold: info.freeShippingThreshold } : DEFAULT_STORE_SHIPPING;
    const subtotal = round2(lines.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0));
    groups.push({ seller, lines, shipping, quote: quoteStoreOrder(subtotal, shipping, options) });
  }
  const total = (pick: (quote: OrderQuote) => number) => round2(groups.reduce((sum, group) => sum + pick(group.quote), 0));
  return {
    groups,
    subtotal: total((quote) => quote.subtotal),
    discount: total((quote) => quote.discount),
    shipping: total((quote) => quote.shipping),
    total: total((quote) => quote.total),
    notOrderable,
  };
}

/** Satırın alabileceği en yüksek adet (seçenek bazlı stok varsa onu kullanır). */
export function lineAvailable(line: CartLine, product: Product): number {
  const option = line.variantLabel ? product.variantOptions?.find((item) => item.label === line.variantLabel) : undefined;
  return option ? option.stock : product.stock;
}

/** Sepet satırındaki stok sorunu; yoksa null. */
export function lineStockProblem(line: CartLine, product: Product): string | null {
  const available = lineAvailable(line, product);
  if (available <= 0) return "Stokta yok";
  if (line.quantity > available) return `Yalnızca ${available} adet kaldı`;
  return null;
}
