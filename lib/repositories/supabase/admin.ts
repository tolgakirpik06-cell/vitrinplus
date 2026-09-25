import { MarketplaceError } from "@/lib/domain/errors";
import type { UploadedDocumentInfo } from "@/lib/domain/seller-documents";
import type { AdminRepository, ApplicationDetailView, ApplicationReviewView, PayoutCandidateView, PayoutView } from "@/lib/repositories/types";
import type { DbSellerStatus, SellerAccountRow, SellerPayoutRow } from "@/types/database";
import { callRpc, first, num, rows, unwrap, type Client } from "./common";
import { mapPayout } from "./mappers";
import { DOCUMENT_COLUMNS, mapDocument, signDocumentUrl } from "./seller-documents";

// Liste ekranı başvuru içeriğini (`application` jsonb: banka, adres, vergi bilgileri) İSTEMEZ; yalnızca detay ekranı yükler.
type ApplicationJoin = Omit<SellerAccountRow, "application"> & { owner: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null; stores: { id: string; name: string } | { id: string; name: string }[] | null };
type ApplicationDetailJoin = SellerAccountRow & {
  owner: { full_name: string; email: string | null; phone: string | null } | { full_name: string; email: string | null; phone: string | null }[] | null;
  reviewer: { full_name: string } | { full_name: string }[] | null;
  stores: { id: string; name: string; description: string } | { id: string; name: string; description: string }[] | null;
};

const LIST_COLUMNS = "id, owner_id, reference, status, selected_plan, rejection_reason, submitted_at, owner:profiles!owner_id(full_name, email), stores(id, name)";
const DETAIL_COLUMNS = "*, owner:profiles!owner_id(full_name, email, phone), reviewer:profiles!reviewed_by(full_name), stores(id, name, description)";

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
      let query = client.from("seller_accounts").select(LIST_COLUMNS).order("submitted_at", { ascending: false }).limit(200);
      if (status) query = query.eq("status", status);
      return rows<ApplicationJoin>(unwrap(await query)).map((row) => ({
        accountId: row.id, storeId: one(row.stores)?.id ?? null, reference: row.reference, storeName: one(row.stores)?.name ?? "—", ownerName: one(row.owner)?.full_name ?? "", ownerEmail: one(row.owner)?.email ?? "",
        plan: row.selected_plan, status: row.status, submittedAt: row.submitted_at, rejectionReason: row.rejection_reason,
      }));
    },
    async getApplicationDetail(accountId): Promise<ApplicationDetailView> {
      const row = first<ApplicationDetailJoin>(unwrap(await client.from("seller_accounts").select(DETAIL_COLUMNS).eq("id", accountId).maybeSingle()));
      if (!row) throw new MarketplaceError("NOT_FOUND", "Başvuru bulunamadı.");
      const documents = rows<Parameters<typeof mapDocument>[0]>(unwrap(await client.from("seller_documents").select(DOCUMENT_COLUMNS).eq("seller_account_id", accountId).order("uploaded_at", { ascending: true })))
        .map(mapDocument)
        .filter((doc): doc is UploadedDocumentInfo => doc !== null);
      return {
        accountId: row.id, storeId: one(row.stores)?.id ?? null, reference: row.reference, storeName: one(row.stores)?.name ?? "—", ownerName: one(row.owner)?.full_name ?? "", ownerEmail: one(row.owner)?.email ?? "",
        plan: row.selected_plan, status: row.status, submittedAt: row.submitted_at, rejectionReason: row.rejection_reason,
        ownerPhone: one(row.owner)?.phone ?? null, storeDescription: one(row.stores)?.description ?? "", reviewedAt: row.reviewed_at, reviewerName: one(row.reviewer)?.full_name ?? null,
        application: row.application, documents,
      };
    },
    async reviewApplication(accountId, decision, reason) {
      await callRpc(client, "admin_review_seller_application", { p_account_id: accountId, p_decision: decision, p_reason: reason ?? null });
    },
    getDocumentUrl: (documentId, mode) => signDocumentUrl(client, documentId, mode),
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
