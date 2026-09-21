import { MarketplaceError } from "@/lib/domain/errors";
import type { PublicQuestionView, QuestionsRepository, StoreQuestionView } from "@/lib/repositories/types";
import type { ProductQuestionRow } from "@/types/database";
import { callRpc, rows, unwrap, type Client } from "./common";
import { idFromProductSlug } from "./mappers";

/** Arayüz ürünleri "demo-<uuid>" slug'ı ile tanır; veritabanı kimliğine çevrilir. */
function productIdOf(ref: string): string {
  const id = idFromProductSlug(ref);
  if (!id) throw new MarketplaceError("PRODUCT_NOT_FOUND", "Bu ürün için soru sorulamaz.");
  return id;
}

/** asker_id / answered_by sütunları API'ye kapalıdır; yalnızca izin verilen sütunlar seçilir. */
const QUESTION_COLUMNS = "id, product_id, store_id, asker_display, question, answer, status, answered_at, created_at";

type StoreQuestionJoin = ProductQuestionRow & { products: { name: string } | { name: string }[] | null };

export function createQuestionsRepository(client: Client, ctx: { storeId: string | null }): QuestionsRepository {
  return {
    async listPublic(productRef): Promise<PublicQuestionView[]> {
      const productId = productIdOf(productRef);
      const data = rows<ProductQuestionRow>(unwrap(await client.from("product_questions").select(QUESTION_COLUMNS).eq("product_id", productId).eq("status", "answered").order("answered_at", { ascending: false }).limit(50)));
      return data.filter((row) => row.answer !== null && row.answered_at !== null).map((row) => ({ id: row.id, askerDisplay: row.asker_display, question: row.question, answer: row.answer ?? "", answeredAt: row.answered_at ?? row.created_at }));
    },
    async listForStore(): Promise<StoreQuestionView[]> {
      if (!ctx.storeId) return [];
      const data = rows<StoreQuestionJoin>(unwrap(await client.from("product_questions").select(`${QUESTION_COLUMNS}, products(name)`).eq("store_id", ctx.storeId).order("created_at", { ascending: false }).limit(300)));
      return data.map((row) => ({
        id: row.id, productId: row.product_id, productName: (Array.isArray(row.products) ? row.products[0] : row.products)?.name ?? "Ürün", askerDisplay: row.asker_display,
        question: row.question, answer: row.answer, status: row.status, answeredAt: row.answered_at, createdAt: row.created_at,
      }));
    },
    async ask(productRef, question) {
      await callRpc(client, "ask_question", { p_product_id: productIdOf(productRef), p_question: question });
    },
    async answer(questionId, answer) {
      await callRpc(client, "answer_question", { p_question_id: questionId, p_answer: answer });
    },
    async setHidden(questionId, hidden) {
      await callRpc(client, "set_question_hidden", { p_question_id: questionId, p_hidden: hidden });
    },
  };
}
