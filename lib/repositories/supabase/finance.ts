import { DEFAULT_FEE_RULES, summarizeLedger, type FeeRule } from "@/lib/domain/ledger";
import type { FinanceOverview, FinanceRepository } from "@/lib/repositories/types";
import type { PlatformFeeRuleRow, SellerLedgerRow, SellerPayoutRow } from "@/types/database";
import { fetchAll, rows, unwrap, type Client } from "./common";
import { mapLedger, mapPayout } from "./mappers";

type LedgerJoin = SellerLedgerRow & { orders: { order_no: string } | { order_no: string }[] | null };

export function createFinanceRepository(client: Client, ctx: { storeId: string | null; storeName: string }): FinanceRepository {
  return {
    async load(): Promise<FinanceOverview> {
      if (!ctx.storeId) return { summary: summarizeLedger([]), entries: [], payouts: [], feeRules: [...DEFAULT_FEE_RULES] };
      const storeId = ctx.storeId;
      const [ledger, payoutRows, ruleRows] = await Promise.all([
        fetchAll<LedgerJoin>((from, to) => client.from("seller_ledger").select("*, orders(order_no)").eq("store_id", storeId).order("created_at", { ascending: false }).range(from, to)),
        fetchAll<SellerPayoutRow>((from, to) => client.from("seller_payouts").select("*").eq("store_id", storeId).order("created_at", { ascending: false }).range(from, to)),
        client.from("platform_fee_rules").select("*").order("sort_order", { ascending: true }),
      ]);
      const entries = ledger.map((row) => mapLedger(row, (Array.isArray(row.orders) ? row.orders[0] : row.orders)?.order_no ?? null));
      const feeRules: FeeRule[] = rows<PlatformFeeRuleRow>(unwrap(ruleRows)).map((rule) => ({ code: rule.code, label: rule.label, rate: Number(rule.rate), sortOrder: rule.sort_order, active: rule.active }));
      return {
        summary: summarizeLedger(entries.map((entry) => ({ entryType: entry.entryType, status: entry.status, gross: entry.gross, discount: entry.discount, shipping: entry.shipping, deductions: entry.deductions, net: entry.net, availableAt: entry.availableAt, payoutId: entry.payoutId }))),
        entries,
        payouts: payoutRows.map((row) => mapPayout(row, ctx.storeName)),
        feeRules: feeRules.length ? feeRules : [...DEFAULT_FEE_RULES],
      };
    },
  };
}
