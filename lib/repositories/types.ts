/**
 * Depo (repository) sözleşmeleri.
 *
 * Arayüz → servis (lib/services) → depo katmanı. İki uygulama vardır:
 *  - `supabase/*`: gerçek veritabanı (RLS + RPC ile korunur),
 *  - `demo/*`: Aşama 1 tarayıcı (localStorage) modu; Supabase yapılandırılmadığında çalışır.
 * Görünüm türleri (View) camelCase'dir ve müşteriye/satıcıya gösterilebilecek alanlarla sınırlıdır.
 */
import type { AppRole } from "@/lib/auth/paths";
import type { FinanceSummary, FeeRule } from "@/lib/domain/ledger";
import type { DbLedgerStatus, DbLedgerType, DbPayoutStatus, DbQuestionStatus, DbReturnReason, DbReturnStatus, DbSellerStatus, DbStockMovementType, LedgerDeduction, NotificationPrefs } from "@/types/database";

export type Page<T> = { items: T[]; total: number };
export type PageRequest = { page: number; pageSize: number };

// ─── Profil / adres / favori ────────────────────────────────────────────────
export type ProfileView = { id: string; email: string; fullName: string; phone: string; avatarUrl: string | null; role: AppRole; notificationPrefs: NotificationPrefs };
export type ProfilePatch = { fullName?: string; phone?: string; avatarUrl?: string | null; notificationPrefs?: NotificationPrefs };

export type AddressView = { id: string; title: string; fullName: string; phone: string; city: string; district: string; addressLine: string; postalCode: string; isDefault: boolean };
export type AddressInput = Omit<AddressView, "id">;

export interface AccountRepository {
  getProfile(): Promise<ProfileView>;
  updateProfile(patch: ProfilePatch): Promise<ProfileView>;
  listAddresses(): Promise<AddressView[]>;
  saveAddress(id: string | null, input: AddressInput): Promise<AddressView[]>;
  deleteAddress(id: string): Promise<AddressView[]>;
  listFavorites(): Promise<string[]>;
  addFavorite(slug: string): Promise<string[]>;
  removeFavorite(slug: string): Promise<string[]>;
}

// ─── İadeler ────────────────────────────────────────────────────────────────
export type ReturnEventView = { id: string; fromStatus: DbReturnStatus | null; toStatus: DbReturnStatus; actorRole: "buyer" | "seller" | "admin" | "system"; note: string | null; createdAt: string };

export type ReturnView = {
  id: string; returnNo: string; orderId: string; orderNo: string; orderItemId: string; productName: string; quantity: number;
  reason: DbReturnReason; description: string | null; status: DbReturnStatus; refundAmount: number; rejectionReason: string | null;
  carrier: string | null; trackingNo: string | null; restock: boolean; customerName: string;
  createdAt: string; approvedAt: string | null; shippedAt: string | null; receivedAt: string | null; refundedAt: string | null;
  events: ReturnEventView[];
};

export type ReturnableItemView = { orderItemId: string; orderId: string; orderNo: string; productName: string; variantLabel: string | null; quantity: number; remaining: number; unitPrice: number; deliveredAt: string; deadline: string };
export type CreateReturnInput = { orderItemId: string; quantity: number; reason: DbReturnReason; description?: string };
export type ReturnTransitionOptions = { note?: string; carrier?: string; tracking?: string; restock?: boolean };

export interface ReturnsRepository {
  listMine(): Promise<ReturnView[]>;
  listForStore(): Promise<ReturnView[]>;
  listReturnable(): Promise<ReturnableItemView[]>;
  create(input: CreateReturnInput): Promise<void>;
  transition(returnId: string, to: DbReturnStatus, options?: ReturnTransitionOptions): Promise<void>;
}

// ─── Soru–cevap ─────────────────────────────────────────────────────────────
export type PublicQuestionView = { id: string; askerDisplay: string; question: string; answer: string; answeredAt: string };
export type StoreQuestionView = { id: string; productId: string; productName: string; askerDisplay: string; question: string; answer: string | null; status: DbQuestionStatus; answeredAt: string | null; createdAt: string };

export interface QuestionsRepository {
  /** `productRef`: arayüzdeki ürün slug'ı ("demo-<id>"). */
  listPublic(productRef: string): Promise<PublicQuestionView[]>;
  listForStore(): Promise<StoreQuestionView[]>;
  ask(productRef: string, question: string): Promise<void>;
  answer(questionId: string, answer: string): Promise<void>;
  setHidden(questionId: string, hidden: boolean): Promise<void>;
}

// ─── Kazanç / ödemeler ──────────────────────────────────────────────────────
export type LedgerEntryView = {
  id: string; orderId: string | null; orderNo: string | null; returnId: string | null; entryType: DbLedgerType; status: DbLedgerStatus;
  gross: number; discount: number; shipping: number; deductions: LedgerDeduction[]; deductionTotal: number; net: number;
  availableAt: string | null; payoutId: string | null; description: string | null; createdAt: string;
};

export type PayoutView = { id: string; payoutNo: string; storeId: string; storeName: string; amount: number; status: DbPayoutStatus; plannedFor: string; paidAt: string | null; provider: string | null; providerReference: string | null; note: string | null; createdAt: string };

export type FinanceOverview = { summary: FinanceSummary; entries: LedgerEntryView[]; payouts: PayoutView[]; feeRules: FeeRule[] };

export interface FinanceRepository {
  load(): Promise<FinanceOverview>;
}

// ─── Stok hareketleri ───────────────────────────────────────────────────────
export type StockMovementView = { id: string; productId: string | null; variantId: string | null; productName: string; type: DbStockMovementType; change: number; before: number; after: number; referenceType: string | null; note: string | null; createdAt: string };

export interface StockRepository {
  movements(options?: { productId?: string; limit?: number }): Promise<StockMovementView[]>;
}

// ─── Yönetici (asgari) ──────────────────────────────────────────────────────
export type ApplicationReviewView = { accountId: string; storeId: string | null; reference: string; storeName: string; ownerName: string; ownerEmail: string; plan: string; status: DbSellerStatus; submittedAt: string; rejectionReason: string | null };
export type PayoutCandidateView = { storeId: string; storeName: string; availableBalance: number };

export interface AdminRepository {
  listApplications(status?: DbSellerStatus): Promise<ApplicationReviewView[]>;
  setApplicationStatus(accountId: string, status: "approved" | "rejected" | "suspended", reason?: string): Promise<void>;
  listPayoutCandidates(): Promise<PayoutCandidateView[]>;
  planPayout(storeId: string): Promise<void>;
  listPayouts(): Promise<PayoutView[]>;
  setPayoutStatus(payoutId: string, status: "processing" | "paid" | "failed" | "cancelled", reference?: string): Promise<void>;
}

// ─── Görsel yükleme ─────────────────────────────────────────────────────────
export type UploadedImage = { path: string; url: string };

export interface StorageRepository {
  uploadProductImage(storeId: string, productId: string, file: Blob, extension: string): Promise<UploadedImage>;
  uploadStoreAsset(storeId: string, kind: "logo" | "banner", file: Blob, extension: string): Promise<UploadedImage>;
  uploadAvatar(userId: string, file: Blob, extension: string): Promise<UploadedImage>;
  removeObjects(bucket: "product-images" | "store-assets" | "avatars", paths: string[]): Promise<void>;
}
