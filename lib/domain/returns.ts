import type { AppRole } from "@/lib/auth/paths";
import type { DbReturnReason, DbReturnStatus } from "@/types/database";
import { MarketplaceError } from "./errors";
import { round2 } from "./money";

/**
 * İade durum makinesi ve yetkileri.
 * KAYNAK DOĞRULUK: supabase/migrations/0004_functions.sql → return_transition_allowed / create_return / transition_return.
 * Gerçek para iadesi (ödeme sağlayıcısı) BAĞLI DEĞİLDİR: "refunded" yalnızca hakediş defterine negatif kayıt düşer.
 */
export const RETURN_WINDOW_DAYS = 14;

export const RETURN_STATUSES: readonly DbReturnStatus[] = ["requested", "approved", "rejected", "shipped", "received", "refunded"];

export const RETURN_TRANSITIONS: Record<DbReturnStatus, readonly DbReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["shipped"],
  rejected: [],
  shipped: ["received"],
  received: ["refunded"],
  refunded: [],
};

export function isReturnTransitionAllowed(from: DbReturnStatus, to: DbReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to);
}

export const returnStatusLabels: Record<DbReturnStatus, string> = {
  requested: "Talep Edildi",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  shipped: "Kargoya Verildi",
  received: "Teslim Alındı",
  refunded: "İade Edildi",
};

export const RETURN_REASONS: readonly DbReturnReason[] = ["defective", "wrong_item", "not_as_described", "damaged_in_shipping", "changed_mind", "other"];

export const returnReasonLabels: Record<DbReturnReason, string> = {
  defective: "Ürün kusurlu / arızalı",
  wrong_item: "Yanlış ürün gönderildi",
  not_as_described: "Ürün açıklamaya uymuyor",
  damaged_in_shipping: "Kargoda hasar gördü",
  changed_mind: "Vazgeçtim",
  other: "Diğer",
};

export type ReturnActor = { id: string | null; role: AppRole | null };
export type ReturnParties = { buyerId: string; sellerId: string; status: DbReturnStatus };
export type ReturnActorRole = "admin" | "seller" | "buyer";

export function returnRoleOf(actor: ReturnActor, ret: ReturnParties): ReturnActorRole | null {
  if (!actor.id) return null;
  if (actor.role === "admin") return "admin";
  if (ret.sellerId === actor.id) return "seller";
  if (ret.buyerId === actor.id) return "buyer";
  return null;
}

export function canViewReturn(actor: ReturnActor, ret: ReturnParties): boolean {
  return returnRoleOf(actor, ret) !== null;
}

type TransitionFailure = "AUTH_REQUIRED" | "RETURN_NOT_FOUND" | "INVALID_TRANSITION" | "FORBIDDEN";

/**
 * Müşteri yalnızca "kargoya verdim" (shipped) diyebilir; onay / ret / teslim alma / iade satıcı ya da yönetici işidir.
 * Başkasının iadesi "bulunamadı" gibi görünür.
 */
export function checkReturnTransition(actor: ReturnActor, ret: ReturnParties, to: DbReturnStatus): { ok: true; role: ReturnActorRole } | { ok: false; code: TransitionFailure } {
  if (!actor.id) return { ok: false, code: "AUTH_REQUIRED" };
  const role = returnRoleOf(actor, ret);
  if (!role) return { ok: false, code: "RETURN_NOT_FOUND" };
  if (!isReturnTransitionAllowed(ret.status, to)) return { ok: false, code: "INVALID_TRANSITION" };
  if (to === "shipped") {
    if (role === "seller") return { ok: false, code: "FORBIDDEN" };
  } else if (role === "buyer") {
    return { ok: false, code: "FORBIDDEN" };
  }
  return { ok: true, role };
}

const RETURN_MESSAGES: Record<TransitionFailure, string> = {
  AUTH_REQUIRED: "Giriş yapmalısın.",
  RETURN_NOT_FOUND: "İade talebi bulunamadı.",
  INVALID_TRANSITION: "Bu iade durumu değişikliği yapılamaz.",
  FORBIDDEN: "Bu iade talebini güncelleme yetkin yok.",
};

export function assertReturnTransition(actor: ReturnActor, ret: ReturnParties, to: DbReturnStatus, note?: string): ReturnActorRole {
  const result = checkReturnTransition(actor, ret, to);
  if (!result.ok) throw new MarketplaceError(result.code, RETURN_MESSAGES[result.code]);
  if (to === "rejected" && (note ?? "").trim().length < 3) throw new MarketplaceError("REASON_REQUIRED", "Ret nedenini yaz.");
  return result.role;
}

// ─── Talep açma kuralları ───────────────────────────────────────────────────

export type ReturnableItem = { orderStatus: string; deliveredAt: string | null; itemQuantity: number; alreadyRequested: number; unitPrice: number; buyerId: string };

/** İade edilebilir adet: teslim edilmiş, süre içinde, kalan adet kadar. Tutar = birim fiyat × adet (sipariş anındaki fiyat). */
export function checkReturnRequest(actorId: string | null, item: ReturnableItem, quantity: number, now: Date = new Date()): { ok: true; refundAmount: number } | { ok: false; code: "AUTH_REQUIRED" | "ITEM_NOT_FOUND" | "NOT_DELIVERED" | "RETURN_WINDOW" | "INVALID_QUANTITY" } {
  if (!actorId) return { ok: false, code: "AUTH_REQUIRED" };
  if (item.buyerId !== actorId) return { ok: false, code: "ITEM_NOT_FOUND" };
  if (item.orderStatus !== "delivered") return { ok: false, code: "NOT_DELIVERED" };
  if (!item.deliveredAt || now.getTime() > new Date(item.deliveredAt).getTime() + RETURN_WINDOW_DAYS * 86_400_000) return { ok: false, code: "RETURN_WINDOW" };
  const remaining = item.itemQuantity - item.alreadyRequested;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > remaining) return { ok: false, code: "INVALID_QUANTITY" };
  return { ok: true, refundAmount: round2(item.unitPrice * quantity) };
}

const REQUEST_MESSAGES = {
  AUTH_REQUIRED: "Giriş yapmalısın.",
  ITEM_NOT_FOUND: "Sipariş kalemi bulunamadı.",
  NOT_DELIVERED: "Yalnızca teslim edilen siparişler için iade talebi açılabilir.",
  RETURN_WINDOW: `İade süresi doldu (teslimden sonra ${RETURN_WINDOW_DAYS} gün).`,
  INVALID_QUANTITY: "İade adedi geçersiz.",
} as const;

export function assertReturnRequest(actorId: string | null, item: ReturnableItem, quantity: number, now: Date = new Date()): number {
  const result = checkReturnRequest(actorId, item, quantity, now);
  if (!result.ok) throw new MarketplaceError(result.code, REQUEST_MESSAGES[result.code]);
  return result.refundAmount;
}
