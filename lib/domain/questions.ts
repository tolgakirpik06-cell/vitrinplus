import type { AppRole } from "@/lib/auth/paths";
import type { DbQuestionStatus } from "@/types/database";
import { MarketplaceError } from "./errors";

/** Soru–cevap kuralları. KAYNAK DOĞRULUK: 0004_functions.sql → ask_question / answer_question / set_question_hidden. */
export const QUESTION_LIMITS = { minQuestion: 5, maxQuestion: 500, minAnswer: 2, maxAnswer: 1000, perHour: 5, pendingPerProduct: 2 } as const;

/** "Ayşe Yılmaz" → "A*** Y." — müşteri adı herkese açık gösterilmez. */
export function maskDisplayName(fullName: string): string {
  const name = fullName.trim();
  if (!name) return "Müşteri";
  const parts = name.split(/\s+/);
  const first = `${parts[0].charAt(0).toLocaleUpperCase("tr-TR")}***`;
  return parts.length > 1 ? `${first} ${parts[parts.length - 1].charAt(0).toLocaleUpperCase("tr-TR")}.` : first;
}

export function validateQuestionText(text: string): string {
  const value = text.trim();
  if (value.length < QUESTION_LIMITS.minQuestion || value.length > QUESTION_LIMITS.maxQuestion) throw new MarketplaceError("INVALID_QUESTION", `Sorun ${QUESTION_LIMITS.minQuestion}–${QUESTION_LIMITS.maxQuestion} karakter olmalı.`);
  return value;
}

export function validateAnswerText(text: string): string {
  const value = text.trim();
  if (value.length < QUESTION_LIMITS.minAnswer || value.length > QUESTION_LIMITS.maxAnswer) throw new MarketplaceError("INVALID_ANSWER", `Yanıt ${QUESTION_LIMITS.minAnswer}–${QUESTION_LIMITS.maxAnswer} karakter olmalı.`);
  return value;
}

export type QuestionActor = { id: string | null; role: AppRole | null };

/** Müşteri soru sorabilir: giriş yapmış olmalı ve kendi ürününe soramaz. */
export function checkAskQuestion(actor: QuestionActor, product: { sellerId: string; sellable: boolean }): { ok: true } | { ok: false; code: "AUTH_REQUIRED" | "PRODUCT_NOT_FOUND" | "OWN_PRODUCT" } {
  if (!actor.id) return { ok: false, code: "AUTH_REQUIRED" };
  if (!product.sellable) return { ok: false, code: "PRODUCT_NOT_FOUND" };
  if (product.sellerId === actor.id) return { ok: false, code: "OWN_PRODUCT" };
  return { ok: true };
}

/** Hız sınırı: saatte 5 soru, aynı üründe yanıtsız en fazla 2 soru. */
export function isQuestionRateLimited(input: { askedLastHour: number; pendingForProduct: number }): boolean {
  return input.askedLastHour >= QUESTION_LIMITS.perHour || input.pendingForProduct >= QUESTION_LIMITS.pendingPerProduct;
}

/** Yalnızca mağaza sahibi (veya yönetici) yanıtlar; başka satıcı yanıtlayamaz. */
export function canAnswerQuestion(actor: QuestionActor, question: { storeOwnerId: string }): boolean {
  if (!actor.id) return false;
  return actor.role === "admin" || (actor.role === "seller" && question.storeOwnerId === actor.id);
}

/** Herkese açık soru listesinde yalnızca yanıtlanmış sorular görünür. */
export function isQuestionPublic(status: DbQuestionStatus): boolean {
  return status === "answered";
}
