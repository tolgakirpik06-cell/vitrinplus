import type { Metadata } from "next";
import { QuestionsPage } from "@/components/seller/pages/QuestionsPage";

export const metadata: Metadata = { title: "Müşteri Soruları" };

export default function SorularPage() {
  return <QuestionsPage />;
}
