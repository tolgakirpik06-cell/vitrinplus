/**
 * Servis katmanı: arayüz ile depo (repository) arasındaki ince katman.
 *  - Domain kurallarını (doğrulama) veritabanına gitmeden ÖNCE uygular → hızlı ve anlaşılır hata.
 *  - Her hatayı kullanıcıya gösterilebilir `MarketplaceError`'a çevirir (ham veritabanı mesajı sızmaz).
 * Yetkilendirme burada DEĞİL, veritabanında (RLS + RPC) uygulanır; servis kontrolleri yalnızca kullanıcı deneyimi içindir.
 * Depo demo ya da Supabase olabilir; servisler hangisi olduğunu bilmez.
 */
import { MAX_ADDRESSES, assertValidAddress, validateProfileFields } from "@/lib/domain/account";
import { MarketplaceError, errorCode, friendlyError } from "@/lib/domain/errors";
import { validateAnswerText, validateQuestionText } from "@/lib/domain/questions";
import { RETURN_REASONS } from "@/lib/domain/returns";
import type {
  AccountRepository, AddressInput, AddressView, AdminRepository, CreateReturnInput, FinanceRepository, ProfilePatch, QuestionsRepository, ReturnsRepository, SellerDocumentFiles, SellerDocumentsRepository, StockRepository,
} from "@/lib/repositories/types";
import type { DbReturnStatus } from "@/types/database";

/** İşlemi çalıştırır; hata olursa güvenli bir `MarketplaceError` fırlatır. */
export async function guarded<T>(action: () => Promise<T> | T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof MarketplaceError) throw error;
    throw new MarketplaceError(errorCode(error) ?? "ERROR", friendlyError(error));
  }
}

// ─── İadeler ────────────────────────────────────────────────────────────────
export function createReturnsService(repo: ReturnsRepository) {
  return {
    listMine: () => guarded(() => repo.listMine()),
    listForStore: () => guarded(() => repo.listForStore()),
    listReturnable: () => guarded(() => repo.listReturnable()),
    request: (input: CreateReturnInput) =>
      guarded(async () => {
        if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new MarketplaceError("INVALID_QUANTITY", "İade adedi geçersiz.");
        if (!RETURN_REASONS.includes(input.reason)) throw new MarketplaceError("INVALID_REASON", "İade nedenini seç.");
        if ((input.description ?? "").trim().length > 1000) throw new MarketplaceError("INVALID_DESCRIPTION", "Açıklama en fazla 1000 karakter olabilir.");
        await repo.create(input);
      }),
    approve: (id: string) => guarded(() => repo.transition(id, "approved")),
    reject: (id: string, reason: string) =>
      guarded(async () => {
        if (reason.trim().length < 3) throw new MarketplaceError("REASON_REQUIRED", "Ret gerekçesini yaz (en az 3 karakter).");
        await repo.transition(id, "rejected", { note: reason.trim() });
      }),
    /** Müşteri ürünü kargoya verdiğini bildirir. */
    shipBack: (id: string, carrier: string, tracking: string) =>
      guarded(async () => {
        if (!carrier.trim() || !tracking.trim()) throw new MarketplaceError("SHIPMENT_REQUIRED", "Kargo firmasını ve takip numarasını yaz.");
        await repo.transition(id, "shipped", { carrier: carrier.trim(), tracking: tracking.trim() });
      }),
    markReceived: (id: string, restock: boolean) => guarded(() => repo.transition(id, "received", { restock })),
    /** Not: gerçek para iadesi yapılmaz; yalnızca kayıt "iade edildi" olarak işaretlenir ve finans kaydı oluşur. */
    markRefunded: (id: string) => guarded(() => repo.transition(id, "refunded")),
    transition: (id: string, to: DbReturnStatus) => guarded(() => repo.transition(id, to)),
  };
}
export type ReturnsService = ReturnType<typeof createReturnsService>;

// ─── Soru–cevap ─────────────────────────────────────────────────────────────
export function createQuestionsService(repo: QuestionsRepository) {
  return {
    listPublic: (productRef: string) => guarded(() => repo.listPublic(productRef)),
    listForStore: () => guarded(() => repo.listForStore()),
    ask: (productRef: string, question: string) => guarded(() => repo.ask(productRef, validateQuestionText(question))),
    answer: (questionId: string, answer: string) => guarded(() => repo.answer(questionId, validateAnswerText(answer))),
    setHidden: (questionId: string, hidden: boolean) => guarded(() => repo.setHidden(questionId, hidden)),
  };
}
export type QuestionsService = ReturnType<typeof createQuestionsService>;

// ─── Hesap ──────────────────────────────────────────────────────────────────
export function createAccountService(repo: AccountRepository) {
  return {
    getProfile: () => guarded(() => repo.getProfile()),
    updateProfile: (patch: ProfilePatch) =>
      guarded(async () => {
        const errors = validateProfileFields(patch);
        if (errors.length) throw new MarketplaceError("INVALID_PROFILE", errors[0]);
        return repo.updateProfile(patch);
      }),
    listAddresses: () => guarded(() => repo.listAddresses()),
    saveAddress: (id: string | null, input: AddressInput): Promise<AddressView[]> =>
      guarded(async () => {
        assertValidAddress(input);
        if (!id) {
          const existing = await repo.listAddresses();
          if (existing.length >= MAX_ADDRESSES) throw new MarketplaceError("ADDRESS_LIMIT", `En fazla ${MAX_ADDRESSES} adres kaydedebilirsin.`);
        }
        return repo.saveAddress(id, input);
      }),
    deleteAddress: (id: string) => guarded(() => repo.deleteAddress(id)),
    listFavorites: () => guarded(() => repo.listFavorites()),
    addFavorite: (slug: string) => guarded(() => repo.addFavorite(slug)),
    removeFavorite: (slug: string) => guarded(() => repo.removeFavorite(slug)),
  };
}
export type AccountService = ReturnType<typeof createAccountService>;

// ─── Finans / stok / yönetim (yalnızca Supabase modunda) ────────────────────
export function createFinanceService(repo: FinanceRepository) {
  return { load: () => guarded(() => repo.load()) };
}
export type FinanceService = ReturnType<typeof createFinanceService>;

export function createStockService(repo: StockRepository) {
  return { movements: (options?: { productId?: string; limit?: number }) => guarded(() => repo.movements(options)) };
}
export type StockService = ReturnType<typeof createStockService>;

/** Veritabanı (0007) ile aynı alt sınır. */
export const MIN_REJECTION_REASON = 5;

export function createAdminService(repo: AdminRepository) {
  return {
    listApplications: (status?: Parameters<AdminRepository["listApplications"]>[0]) => guarded(() => repo.listApplications(status)),
    getApplicationDetail: (accountId: string) => guarded(() => repo.getApplicationDetail(accountId)),
    /** Bekleyen başvuruyu onaylar (mağaza aktifleşir, hesap satıcı olur). Zaten sonuçlanmış başvuruda veritabanı reddeder. */
    approveApplication: (accountId: string) => guarded(() => repo.reviewApplication(accountId, "approve")),
    /** Bekleyen başvuruyu reddeder; ret nedeni zorunludur, kaydedilir ve satıcıya gösterilir. */
    rejectApplication: (accountId: string, reason: string) =>
      guarded(async () => {
        if (reason.trim().length < MIN_REJECTION_REASON) throw new MarketplaceError("REASON_REQUIRED", `Red nedenini yaz (en az ${MIN_REJECTION_REASON} karakter).`);
        await repo.reviewApplication(accountId, "reject", reason.trim());
      }),
    /** Askıdaki mağazayı yeniden etkinleştirir (bekleyen başvuru kararı değildir). */
    reactivate: (accountId: string) => guarded(() => repo.setApplicationStatus(accountId, "approved")),
    getDocumentUrl: (documentId: string, mode: "view" | "download") => guarded(() => repo.getDocumentUrl(documentId, mode)),
    suspend: (accountId: string, reason: string) =>
      guarded(async () => {
        if (reason.trim().length < 3) throw new MarketplaceError("REASON_REQUIRED", "Gerekçeyi yaz (en az 3 karakter).");
        await repo.setApplicationStatus(accountId, "suspended", reason.trim());
      }),
    listPayoutCandidates: () => guarded(() => repo.listPayoutCandidates()),
    planPayout: (storeId: string) => guarded(() => repo.planPayout(storeId)),
    listPayouts: () => guarded(() => repo.listPayouts()),
    setPayoutStatus: (payoutId: string, status: Parameters<AdminRepository["setPayoutStatus"]>[1], reference?: string) => guarded(() => repo.setPayoutStatus(payoutId, status, reference)),
  };
}
export type AdminService = ReturnType<typeof createAdminService>;

export function createSellerDocumentsService(repo: SellerDocumentsRepository) {
  return {
    list: () => guarded(() => repo.list()),
    upload: (files: SellerDocumentFiles) => guarded(() => repo.upload(files)),
    getUrl: (documentId: string, mode: "view" | "download") => guarded(() => repo.getUrl(documentId, mode)),
  };
}
export type SellerDocumentsService = ReturnType<typeof createSellerDocumentsService>;

/** Modlara göre değişen servis kümesi. `null` = bu modda yok (ör. demo modunda gerçek finans defteri yoktur). */
export type Services = {
  returns: ReturnsService;
  questions: QuestionsService;
  account: AccountService;
  finance: FinanceService | null;
  stock: StockService | null;
  admin: AdminService | null;
  /** Satıcı belgeleri (özel depolama). Yalnızca giriş yapmış Supabase kullanıcısında; demo modunda `null`. */
  sellerDocuments: SellerDocumentsService | null;
};

export type Repositories = {
  returns: ReturnsRepository;
  questions: QuestionsRepository;
  account: AccountRepository;
  finance?: FinanceRepository;
  stock?: StockRepository;
  admin?: AdminRepository;
  sellerDocuments?: SellerDocumentsRepository;
};

export function createServices(repos: Repositories): Services {
  return {
    returns: createReturnsService(repos.returns),
    questions: createQuestionsService(repos.questions),
    account: createAccountService(repos.account),
    finance: repos.finance ? createFinanceService(repos.finance) : null,
    stock: repos.stock ? createStockService(repos.stock) : null,
    admin: repos.admin ? createAdminService(repos.admin) : null,
    sellerDocuments: repos.sellerDocuments ? createSellerDocumentsService(repos.sellerDocuments) : null,
  };
}
