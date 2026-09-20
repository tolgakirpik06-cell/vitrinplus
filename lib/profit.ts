/**
 * Kâr hesaplayıcı — saf fonksiyonlar (arayüzden bağımsız, test edilebilir).
 *
 * Örnek: maliyet 500 + kargo 70 + paketleme 15 + ödeme altyapısı 25 + diğer 10
 * = 620 TL toplam maliyet. 899 TL satışta kâr 279 TL, marj ≈ %31.
 * Hedef marj %30 için: 620 / (1 - 0.30) = 885,71 → 886 TL.
 */
import { COMMISSION_RATE } from "@/lib/plans";

export type CostBreakdown = {
  /** Ürün maliyeti (alış fiyatı). */
  productCost: number;
  shipping: number;
  packaging: number;
  /** Ödeme altyapısı kesintisi (TL). */
  payment: number;
  other: number;
};

export const emptyCosts: CostBreakdown = { productCost: 0, shipping: 0, packaging: 0, payment: 0, other: 0 };

/** Ödeme altyapısı kesintisi tahmini oranı (yaklaşık %2,9). */
export const PAYMENT_FEE_RATE = 0.029;

export type ProfitResult = {
  price: number;
  commission: number;
  /** Komisyon dahil toplam maliyet. */
  totalCost: number;
  profit: number;
  /** Yüzde olarak marj (31.03). Fiyat 0 ise 0. */
  margin: number;
};

function safe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Komisyon hariç sabit maliyetlerin toplamı. */
export function fixedCost(costs: CostBreakdown): number {
  return safe(costs.productCost) + safe(costs.shipping) + safe(costs.packaging) + safe(costs.payment) + safe(costs.other);
}

export function calcProfit(price: number, costs: CostBreakdown, commissionRate: number = COMMISSION_RATE): ProfitResult {
  const p = Math.max(0, safe(price));
  const commission = Math.round(p * commissionRate * 100) / 100;
  const totalCost = fixedCost(costs) + commission;
  const profit = p - totalCost;
  return { price: p, commission, totalCost, profit, margin: p > 0 ? (profit / p) * 100 : 0 };
}

/**
 * Hedef marja ulaşmak için gereken satış fiyatı (TL, yukarı yuvarlanmış tam sayı).
 * Marj + komisyon %100 veya üstüyse ya da maliyet yoksa null döner.
 */
export function priceForTargetMargin(costs: CostBreakdown, targetMarginPercent: number, commissionRate: number = COMMISSION_RATE): number | null {
  const cost = fixedCost(costs);
  const denominator = 1 - safe(targetMarginPercent) / 100 - commissionRate;
  if (cost <= 0 || denominator <= 0.0001 || targetMarginPercent < 0) return null;
  return Math.ceil(cost / denominator - 1e-9);
}

/** Bir ürünün birim maliyeti (opsiyonel ek maliyetler dahil). */
export function unitCost(product: { cost: number; costs?: Partial<Omit<CostBreakdown, "productCost">> }): number {
  const extra = product.costs;
  return safe(product.cost) + safe(extra?.shipping ?? 0) + safe(extra?.packaging ?? 0) + safe(extra?.payment ?? 0) + safe(extra?.other ?? 0);
}

/** Maliyet girilmemişse (0) kâr bilinmez; arayüz "—" gösterir. */
export function hasKnownCost(product: { cost: number }): boolean {
  return safe(product.cost) > 0;
}

/** Ürün başına tahmini kâr. Maliyet bilinmiyorsa null. */
export function estimatedUnitProfit(product: { price: number; cost: number; costs?: Partial<Omit<CostBreakdown, "productCost">> }): number | null {
  if (!hasKnownCost(product)) return null;
  return product.price - unitCost(product) - product.price * COMMISSION_RATE;
}
