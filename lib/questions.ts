"use client";

/**
 * "Satıcıya Sor" soru–cevap deposu (demo, localStorage).
 *
 * Müşteri ürün sayfasından soru sorar; soru mağaza adına göre saklanır.
 * Satıcı panelindeki "Müşteri Soruları" ekranı kendi mağazasının sorularını
 * görür ve yanıtlar. Tam Q&A akışı (bildirim, moderasyon, ürün sayfasında
 * yanıtların yayınlanması) sonraki aşamadadır; veri modeli buna hazırdır.
 */
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { STORAGE_KEYS } from "@/lib/storage-migration";

export type QuestionStatus = "bekliyor" | "yanitlandi";

export type SellerQuestion = {
  id: string;
  /** Sorunun yöneltildiği mağazanın görünen adı (ürün sayfasındaki satıcı adı). */
  sellerName: string;
  productSlug?: string;
  productName?: string;
  customerName: string;
  question: string;
  createdAt: string;
  status: QuestionStatus;
  answer?: string;
  answeredAt?: string;
  sample?: boolean;
};

type QuestionsState = { version: 1; items: SellerQuestion[] };

const initialState: QuestionsState = { version: 1, items: [] };

function isQuestion(value: unknown): value is SellerQuestion {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.sellerName === "string" && typeof item.question === "string" && typeof item.createdAt === "string" && (item.status === "bekliyor" || item.status === "yanitlandi");
}

function parseState(raw: unknown): QuestionsState {
  if (typeof raw !== "object" || raw === null) return initialState;
  const record = raw as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.items)) return initialState;
  return { version: 1, items: record.items.filter(isQuestion) };
}

export const questionsStore = createLocalStore<QuestionsState>({ key: STORAGE_KEYS.questions, initial: initialState, parse: parseState });

const normalize = (text: string) => text.trim().toLocaleLowerCase("tr-TR");

export function useQuestions(sellerName: string): SellerQuestion[] {
  const state = useLocalStore(questionsStore);
  const key = normalize(sellerName);
  return state.items.filter((item) => normalize(item.sellerName) === key).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function useOpenQuestionCount(sellerName: string): number {
  return useQuestions(sellerName).filter((item) => item.status === "bekliyor").length;
}

/** Yeni soru ekler. Depolama hatasında fırlatır. */
export function askQuestion(input: { sellerName: string; productSlug?: string; productName?: string; customerName: string; question: string }): SellerQuestion {
  const text = input.question.trim();
  if (text.length < 5) throw new Error("Sorun en az 5 karakter olmalı.");
  if (text.length > 500) throw new Error("Sorun en fazla 500 karakter olabilir.");
  const item: SellerQuestion = {
    id: `Q-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    sellerName: input.sellerName,
    productSlug: input.productSlug,
    productName: input.productName,
    customerName: input.customerName.trim() || "Misafir",
    question: text,
    createdAt: new Date().toISOString(),
    status: "bekliyor",
  };
  questionsStore.update((state) => ({ ...state, items: [item, ...state.items].slice(0, 500) }));
  return item;
}

export function answerQuestion(id: string, answer: string): void {
  const text = answer.trim();
  if (text.length < 2) throw new Error("Yanıt boş olamaz.");
  questionsStore.update((state) => ({
    ...state,
    items: state.items.map((item) => (item.id === id ? { ...item, status: "yanitlandi" as const, answer: text, answeredAt: new Date().toISOString() } : item)),
  }));
}

export function removeSampleQuestions(sellerName: string): void {
  const key = normalize(sellerName);
  questionsStore.update((state) => ({ ...state, items: state.items.filter((item) => !(item.sample && normalize(item.sellerName) === key)) }));
}

export function addQuestions(items: SellerQuestion[]): void {
  questionsStore.update((state) => ({ ...state, items: [...items.filter((item) => !state.items.some((existing) => existing.id === item.id)), ...state.items] }));
}
