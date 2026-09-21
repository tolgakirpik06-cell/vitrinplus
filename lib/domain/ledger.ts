import type { DbLedgerStatus, DbLedgerType, DbPayoutStatus, LedgerDeduction } from "@/types/database";
import { round2 } from "./money";

/**
 * Hakediş defteri ve ödeme kuralları.
 * KAYNAK DOĞRULUK: 0001_foundation.sql (platform_fee_rules, payout_hold_days) ve 0004_functions.sql (place_order, transition_return, plan_payout).
 *
 *   net = brüt − indirim + kargo − kesintiler
 *
 * VitrinPlus satış komisyonu %0'dır; kesintiler `platform_fee_rules` tablosundan gelir (yeni kesinti = yeni satır, kod değişmez).
 * Ödeme sağlayıcısı kesintisi için de bir yuva vardır (şimdilik %0). Gerçek banka transferi / ödeme sağlayıcısı BAĞLI DEĞİLDİR.
 */
export const PAYOUT_HOLD_DAYS = 14;

export type FeeRule = { code: string; label: string; rate: number; sortOrder: number; active?: boolean };

/** Veritabanı seed'iyle aynı varsayılan kurallar (kurallar tablosu okunamazsa gösterim için). */
export const DEFAULT_FEE_RULES: readonly FeeRule[] = [
  { code: "commission", label: "VitrinPlus Satış Komisyonu", rate: 0, sortOrder: 10 },
  { code: "payment_provider", label: "Ödeme Altyapısı Kesintisi", rate: 0, sortOrder: 20 },
];

export function computeDeductions(base: number, rules: readonly FeeRule[] = DEFAULT_FEE_RULES): LedgerDeduction[] {
  return rules
    .filter((rule) => rule.active !== false)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((rule) => ({ type: rule.code, label: rule.label, rate: rule.rate, amount: round2(base * rule.rate) }));
}

export function deductionsTotal(deductions: readonly LedgerDeduction[]): number {
  return round2(deductions.reduce((total, deduction) => total + deduction.amount, 0));
}

export type LedgerAmounts = { gross: number; discount: number; shipping: number; deductions: LedgerDeduction[]; deductionTotal: number; net: number };

/**
 * Satış kaydı: brüt = liste fiyatı toplamı, indirim = satıcının kendi fiyat indirimi, kargo = müşterinin ödediği kargo (satıcıya yazılır).
 * Platform kuponu (VITRINPLUS10) satıcı hakedişinden DÜŞÜLMEZ.
 */
export function computeSaleEntry(input: { listTotal: number; subtotal: number; shipping: number; rules?: readonly FeeRule[] }): LedgerAmounts {
  const gross = round2(input.listTotal);
  const discount = round2(input.listTotal - input.subtotal);
  const deductions = computeDeductions(round2(input.subtotal), input.rules);
  const deductionTotal = deductionsTotal(deductions);
  return { gross, discount, shipping: round2(input.shipping), deductions, deductionTotal, net: round2(gross - discount + input.shipping - deductionTotal) };
}

/** İade kaydı: hakedişe NEGATİF tutar yazılır (gerçek para iadesi yapılmaz). */
export function computeReturnEntry(refundAmount: number, rules?: readonly FeeRule[]): LedgerAmounts {
  const deductions = computeDeductions(-refundAmount, rules);
  const deductionTotal = deductionsTotal(deductions);
  return { gross: -round2(refundAmount), discount: 0, shipping: 0, deductions, deductionTotal, net: round2(-refundAmount - deductionTotal) };
}

export type LedgerLike = {
  entryType: DbLedgerType;
  status: DbLedgerStatus;
  gross: number;
  discount: number;
  shipping: number;
  deductions: readonly LedgerDeduction[];
  net: number;
  availableAt: string | null;
  payoutId: string | null;
};

export type FinanceSummary = {
  grossSales: number;
  sellerDiscounts: number;
  returns: number;
  shipping: number;
  deductionsByType: Record<string, number>;
  /** "VitrinPlus Satış Komisyonu" toplamı — her zaman gösterilir (kayıt yoksa 0). */
  commission: number;
  paymentProviderDeduction: number;
  net: number;
  /** Teslim/bekleme süresi dolmadığı için henüz ödemeye hazır olmayan bakiye. */
  pendingBalance: number;
  /** Ödemeye hazır (henüz bir ödemeye bağlanmamış) bakiye. */
  availableBalance: number;
  /** Ödeme planına bağlanmış, henüz ödenmemiş tutar. */
  plannedBalance: number;
  paidTotal: number;
};

export function summarizeLedger(entries: readonly LedgerLike[], now: Date = new Date()): FinanceSummary {
  const summary: FinanceSummary = { grossSales: 0, sellerDiscounts: 0, returns: 0, shipping: 0, deductionsByType: {}, commission: 0, paymentProviderDeduction: 0, net: 0, pendingBalance: 0, availableBalance: 0, plannedBalance: 0, paidTotal: 0 };
  for (const entry of entries) {
    if (entry.status === "reversed") continue;
    if (entry.entryType === "sale") {
      summary.grossSales += entry.gross;
      summary.sellerDiscounts += entry.discount;
      summary.shipping += entry.shipping;
    } else if (entry.entryType === "return") {
      summary.returns += Math.abs(entry.gross);
    }
    for (const deduction of entry.deductions) summary.deductionsByType[deduction.type] = round2((summary.deductionsByType[deduction.type] ?? 0) + deduction.amount);
    summary.net += entry.net;
    if (entry.status === "paid") {
      summary.paidTotal += entry.net;
    } else if (entry.payoutId) {
      summary.plannedBalance += entry.net;
    } else if (entry.availableAt !== null && new Date(entry.availableAt).getTime() <= now.getTime()) {
      summary.availableBalance += entry.net;
    } else {
      summary.pendingBalance += entry.net;
    }
  }
  summary.grossSales = round2(summary.grossSales);
  summary.sellerDiscounts = round2(summary.sellerDiscounts);
  summary.returns = round2(summary.returns);
  summary.shipping = round2(summary.shipping);
  summary.net = round2(summary.net);
  summary.pendingBalance = round2(summary.pendingBalance);
  summary.availableBalance = round2(summary.availableBalance);
  summary.plannedBalance = round2(summary.plannedBalance);
  summary.paidTotal = round2(summary.paidTotal);
  summary.commission = summary.deductionsByType.commission ?? 0;
  summary.paymentProviderDeduction = summary.deductionsByType.payment_provider ?? 0;
  return summary;
}

// ─── Ödeme kayıtları (yalnızca yönetici planlar; sağlayıcı bağımsız) ────────

export const PAYOUT_TRANSITIONS: Record<DbPayoutStatus, readonly DbPayoutStatus[]> = {
  planned: ["processing", "paid", "cancelled", "failed"],
  processing: ["paid", "failed"],
  paid: [],
  failed: [],
  cancelled: [],
};

export function isPayoutTransitionAllowed(from: DbPayoutStatus, to: DbPayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].includes(to);
}

export const payoutStatusLabels: Record<DbPayoutStatus, string> = {
  planned: "Planlandı",
  processing: "İşleniyor",
  paid: "Ödendi",
  failed: "Başarısız",
  cancelled: "İptal Edildi",
};

/** Teslimden sonra ödemeye hazır olma zamanı (bekleme süresi 14 gün). */
export function payoutAvailableAt(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + PAYOUT_HOLD_DAYS * 86_400_000);
}
