"use client";

/** Soru–cevap deposu — demo uygulaması: Aşama 1'deki yerel soru deposunu (lib/questions.ts) depo sözleşmesine uyarlar. */
import { answerQuestion, askQuestion, questionsStore, type SellerQuestion } from "@/lib/questions";
import { MarketplaceError } from "@/lib/domain/errors";
import { maskDisplayName } from "@/lib/domain/questions";
import type { PublicQuestionView, QuestionsRepository, StoreQuestionView } from "@/lib/repositories/types";

export type DemoQuestionsContext = {
  /** Mağaza sahibinin görünen mağaza adı (soru–mağaza eşleşmesi bu adla yapılır). */
  storeName: string | null;
  customerName: string;
  /** Slug → ürün adı / mağaza adı çözümü (soru sorarken gerekli). */
  resolveProduct: (slug: string) => { name: string; seller: string } | undefined;
};

const norm = (text: string) => text.trim().toLocaleLowerCase("tr-TR");

function toStoreView(item: SellerQuestion): StoreQuestionView {
  return {
    id: item.id, productId: item.productSlug ?? "", productName: item.productName ?? "Ürün", askerDisplay: maskDisplayName(item.customerName), question: item.question,
    answer: item.answer ?? null, status: item.status === "yanitlandi" ? "answered" : "pending", answeredAt: item.answeredAt ?? null, createdAt: item.createdAt,
  };
}

export function createDemoQuestionsRepository(ctx: DemoQuestionsContext): QuestionsRepository {
  return {
    async listPublic(productSlug) {
      return questionsStore.getSnapshot().items
        .filter((item) => item.productSlug === productSlug && item.status === "yanitlandi" && item.answer)
        .sort((a, b) => new Date(b.answeredAt ?? b.createdAt).getTime() - new Date(a.answeredAt ?? a.createdAt).getTime())
        .map<PublicQuestionView>((item) => ({ id: item.id, askerDisplay: maskDisplayName(item.customerName), question: item.question, answer: item.answer ?? "", answeredAt: item.answeredAt ?? item.createdAt }));
    },
    async listForStore() {
      if (!ctx.storeName) return [];
      const key = norm(ctx.storeName);
      return questionsStore.getSnapshot().items.filter((item) => norm(item.sellerName) === key).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(toStoreView);
    },
    async ask(productSlug, question) {
      const product = ctx.resolveProduct(productSlug);
      if (!product) throw new MarketplaceError("PRODUCT_NOT_FOUND", "Ürün bulunamadı.");
      askQuestion({ sellerName: product.seller, productSlug, productName: product.name, customerName: ctx.customerName, question });
    },
    async answer(questionId, answer) {
      answerQuestion(questionId, answer);
    },
    async setHidden() {
      throw new MarketplaceError("UNSUPPORTED", "Soruları gizleme yalnızca canlı (Supabase) modunda kullanılabilir.");
    },
  };
}
