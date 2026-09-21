import type { FinanceOverview } from "@/lib/repositories/types";
import type { PayoutSummary } from "@/lib/seller-analytics";

/**
 * Gerçek mod: satıcı panelindeki ödeme özeti (genel bakış, yapılacaklar) kazanç defterinden türetilir.
 *  - paidOut: ödenen net tutar,
 *  - pending: henüz ödenmemiş net (bekleyen + ödemeye hazır + planlanan),
 *  - sonraki ödeme: en yakın planlanmış / işlenen ödeme kaydı.
 */
export function summarizeLivePayouts(finance: FinanceOverview): PayoutSummary {
  const { summary, payouts } = finance;
  const upcoming = payouts.filter((payout) => payout.status === "planned" || payout.status === "processing").sort((a, b) => new Date(a.plannedFor).getTime() - new Date(b.plannedFor).getTime());
  const next = upcoming[0];
  return {
    paidOut: summary.paidTotal,
    pending: Math.round((summary.pendingBalance + summary.availableBalance + summary.plannedBalance) * 100) / 100,
    nextPayoutAt: next ? new Date(next.plannedFor) : null,
    nextPayoutAmount: next ? next.amount : 0,
  };
}
