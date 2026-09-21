import type { AdminRepository, ApplicationReviewView, PayoutCandidateView, PayoutView } from "@/lib/repositories/types";
import type { DbSellerStatus, SellerAccountRow, SellerPayoutRow } from "@/types/database";
import { callRpc, num, rows, unwrap, type Client } from "./common";
import { mapPayout } from "./mappers";

type ApplicationJoin = SellerAccountRow & { owner: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null; stores: { id: string; name: string } | { id: string; name: string }[] | null };

function one<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

/** Asgari yönetici işlemleri (başvuru onayı, ödeme planı). Yetki veritabanı fonksiyonlarında kontrol edilir; arayüz gizlemesi güvenlik değildir. */
export function createAdminRepository(client: Client): AdminRepository {
  async function listPayouts(): Promise<PayoutView[]> {
    const data = rows<SellerPayoutRow & { stores: { name: string } | { name: string }[] | null }>(unwrap(await client.from("seller_payouts").select("*, stores(name)").order("created_at", { ascending: false }).limit(200)));
    return data.map((row) => mapPayout(row, one(row.stores)?.name ?? "Mağaza"));
  }
  return {
    async listApplications(status?: DbSellerStatus): Promise<ApplicationReviewView[]> {
      let query = client.from("seller_accounts").select("*, owner:profiles!owner_id(full_name, email), stores(id, name)").order("submitted_at", { ascending: false }).limit(200);
      if (status) query = query.eq("status", status);
      return rows<ApplicationJoin>(unwrap(await query)).map((row) => ({
        accountId: row.id, storeId: one(row.stores)?.id ?? null, reference: row.reference, storeName: one(row.stores)?.name ?? "—", ownerName: one(row.owner)?.full_name ?? "", ownerEmail: one(row.owner)?.email ?? "",
        plan: row.selected_plan, status: row.status, submittedAt: row.submitted_at, rejectionReason: row.rejection_reason,
      }));
    },
    async setApplicationStatus(accountId, status, reason) {
      await callRpc(client, "admin_set_seller_status", { p_account_id: accountId, p_status: status, p_reason: reason ?? null });
    },
    async listPayoutCandidates(): Promise<PayoutCandidateView[]> {
      const now = new Date().toISOString();
      const ledger = rows<{ store_id: string; net_amount: number; stores: { name: string } | { name: string }[] | null }>(
        unwrap(await client.from("seller_ledger").select("store_id, net_amount, stores(name)").eq("status", "pending").is("payout_id", null).not("available_at", "is", null).lte("available_at", now).limit(5000))
      );
      const totals = new Map<string, PayoutCandidateView>();
      for (const row of ledger) {
        const current = totals.get(row.store_id) ?? { storeId: row.store_id, storeName: one(row.stores)?.name ?? "Mağaza", availableBalance: 0 };
        current.availableBalance += num(row.net_amount);
        totals.set(row.store_id, current);
      }
      return [...totals.values()].filter((item) => item.availableBalance > 0).map((item) => ({ ...item, availableBalance: Math.round(item.availableBalance * 100) / 100 }));
    },
    async planPayout(storeId) {
      await callRpc(client, "plan_payout", { p_store_id: storeId });
    },
    listPayouts,
    async setPayoutStatus(payoutId, status, reference) {
      await callRpc(client, "set_payout_status", { p_payout_id: payoutId, p_status: status, p_provider: reference ? "manuel" : null, p_reference: reference ?? null, p_note: null });
    },
  };
}
